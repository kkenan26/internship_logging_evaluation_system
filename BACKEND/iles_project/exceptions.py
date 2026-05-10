"""
Custom exception handler for REST API responses.
Provides consistent error response format across all endpoints.
"""

import logging
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error response format.
    
    Args:
        exc: The exception that was raised
        context: The context dictionary passed to the exception handler
        
    Returns:
        Response with standardized error format or None
    """
    response = drf_exception_handler(exc, context)
    
    # Log the exception
    logger.error(
        f"API Exception: {exc.__class__.__name__}",
        exc_info=True,
        extra={
            'view': context.get('view').__class__.__name__ if context.get('view') else 'Unknown',
            'request': context.get('request')
        }
    )
    
    if response is None:
        # Unhandled exception - return generic error message
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'errors': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Format the response
    formatted_response = {
        'success': False,
        'message': str(response.data.get('detail', 'An error occurred')) if isinstance(response.data, dict) and 'detail' in response.data else str(response.data),
        'errors': response.data if isinstance(response.data, dict) and 'detail' not in response.data else None
    }
    
    return Response(formatted_response, status=response.status_code)
