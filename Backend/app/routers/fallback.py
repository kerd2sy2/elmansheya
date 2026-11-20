from fastapi import APIRouter, Request, Response
from app.services.proxy import forward_to_upstream

router = APIRouter(tags=["Upstream Proxy"])

@router.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def fallback_proxy(request: Request, full_path: str) -> Response:
    client = request.app.state.http_client
    return await forward_to_upstream(request, client)
