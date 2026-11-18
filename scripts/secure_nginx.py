import paramiko

conf = """server {
    server_name elmansheya.kerd2sy.com 2.28.227.123 _;

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /activate {
        proxy_pass http://127.0.0.1:8080/activate;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Secure official landing page - WhatsApp QR is hidden from public view
    location / {
        default_type text/html;
        return 200 '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>تطبيق المنشية</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:16px;text-align:center}.card{background:#1e293b;border:1px solid #334155;padding:40px 24px;border-radius:24px;max-width:440px;box-shadow:0 15px 35px rgba(0,0,0,0.5)}h1{color:#38bdf8;margin:0 0 10px;font-size:26px}p{color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px}.badge{display:inline-block;background:#065f46;color:#34d399;padding:6px 16px;border-radius:999px;font-weight:bold;font-size:13px}</style></head><body><div class="card"><h1>🏛️ تطبيق المنشية</h1><p>المنصة الرسمية الموحدة لأهالي قرية المنشية الكبرى.</p><div class="badge">● الخادم السحابي مؤمن ويعمل بنجاح</div></div></body></html>';
    }

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/elmansheya.kerd2sy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elmansheya.kerd2sy.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = elmansheya.kerd2sy.com) {
        return 301 https://$host$request_uri;
    }

    listen 80 default_server;
    listen [::]:80 default_server;
    server_name elmansheya.kerd2sy.com 2.28.227.123 _;
    return 404;
}
"""

def update_nginx():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('2.28.227.123', username='root', password='Elmansheya@2026!Root', timeout=10)

    sftp = ssh.open_sftp()
    with sftp.file('/etc/nginx/sites-available/default', 'w') as f:
        f.write(conf)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
    out = stdout.read().decode()
    err = stderr.read().decode()
    print("Nginx reload output:")
    print(out)
    print(err)
    ssh.close()

if __name__ == '__main__':
    update_nginx()
