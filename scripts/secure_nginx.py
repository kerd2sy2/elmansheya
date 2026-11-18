import os
import json
import paramiko

ADMIN_EXACT_ROUTES = (
    '/',
    '/admin/login',
    '/admin/state',
    '/admin/pair',
    '/admin/reconnect',
    '/admin/reset',
    '/admin/check-number',
    '/admin/test-otp',
    '/admin/logout',
)

PROXY_HEADERS = """        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;"""


def build_admin_locations() -> str:
    blocks = []
    for route in ADMIN_EXACT_ROUTES:
        blocks.append(
            f"    location = {route} {{\n"
            f"        proxy_pass http://127.0.0.1:3005;\n"
            f"{PROXY_HEADERS}\n"
            f"    }}"
        )
    return "\n\n".join(blocks)


def build_nginx_conf() -> str:
    admin_blocks = build_admin_locations()
    return f"""server {{
    server_name elmansheya.kerd2sy.com 2.28.227.123 _;

    gzip on;
    gzip_types application/json application/javascript;

    error_page 403 404 405 =200 /notfound.html;

    # API endpoints - mistyped or missing API routes show the themed animation
    location /api/ {{
        proxy_pass http://127.0.0.1:8080/api/;
{PROXY_HEADERS}
        proxy_intercept_errors on;
        error_page 404 =200 /notfound.html;
    }}

    # Exact-match root login & multi-page control portal routes only
{admin_blocks}

    location = /notfound.html {{
        root /var/www/elmansheya;
    }}

    # Any other route (including /wa and wrong paths) serves only the themed Lottie animation (zero text/data)
    location / {{
        root /var/www/elmansheya;
        try_files /notfound.html =404;
    }}

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/elmansheya.kerd2sy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elmansheya.kerd2sy.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}}

server {{
    if ($host = elmansheya.kerd2sy.com) {{
        return 301 https://$host$request_uri;
    }}

    listen 80 default_server;
    listen [::]:80 default_server;
    server_name elmansheya.kerd2sy.com 2.28.227.123 _;
    root /var/www/elmansheya;
    error_page 403 404 405 =200 /notfound.html;
    location = /notfound.html {{
        root /var/www/elmansheya;
    }}
    location / {{
        try_files /notfound.html =404;
    }}
}}
"""


def build_notfound_html() -> str:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lottie_json_path = os.path.join(
        root_dir, 'Frontend', 'assets', 'lottie', 'not_found_404.json'
    )
    with open(lottie_json_path, 'r', encoding='utf-8') as f:
        anim_data = json.load(f)
    minified_json = json.dumps(
        anim_data, separators=(',', ':'), ensure_ascii=False
    ).replace('</', '<\\/')

    return (
        '<!DOCTYPE html><html lang="ar"><head>'
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        '<title>&#8203;</title>'
        '<style>'
        'html,body{margin:0;padding:0;width:100%;height:100%;'
        'display:flex;align-items:center;justify-content:center;'
        'background:#FAF5EE;overflow:hidden}'
        '#anim{width:min(82vw,420px);height:min(82vw,420px)}'
        '</style></head><body>'
        '<div id="anim"></div>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>'
        f'<script>lottie.loadAnimation({{container:document.getElementById("anim"),renderer:"svg",loop:true,autoplay:true,animationData:{minified_json}}});</script>'
        '</body></html>'
    )


def update_nginx():
    html_content = build_notfound_html()
    conf_content = build_nginx_conf()

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('2.28.227.123', username='root', password='Elmansheya@2026!Root', timeout=10)

    _, stdout_mkdir, stderr_mkdir = ssh.exec_command('mkdir -p /var/www/elmansheya')
    if stdout_mkdir.channel.recv_exit_status() != 0:
        raise RuntimeError(stderr_mkdir.read().decode())

    sftp = ssh.open_sftp()
    with sftp.file('/var/www/elmansheya/notfound.html', 'w') as f:
        f.write(html_content)
    with sftp.file('/etc/nginx/sites-available/default', 'w') as f:
        f.write(conf_content)
    sftp.close()

    _, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    ssh.close()

    print('Nginx reload output:')
    if out:
        print(out)
    if err:
        print(err)
    if exit_code != 0:
        raise SystemExit(f'nginx reload failed with exit code {exit_code}')


if __name__ == '__main__':
    update_nginx()
