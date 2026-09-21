from typing import Any, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse


class APIError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details


def success_response(data: Any, message: Optional[str] = None) -> dict:
    """Standard success response envelope."""
    payload = {"success": True, "data": data}
    if message:
        payload["message"] = message
    return payload


def error_json_response(
    status_code: int,
    code: str,
    message: str,
    details: Optional[Any] = None,
) -> JSONResponse:
    """Standard error response envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        },
    )
