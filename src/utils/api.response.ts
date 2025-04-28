function createGenericResponse(success: boolean, message: string, data: any, error: any) {
    const datetime = new Date().toISOString();
    return {
        success: success,
        message: message,
        data: data,
        error: error,
        datetime: datetime,
    };
}

export function ErrorResponse(error: any) {
    return createGenericResponse(false, 'Something went wrong', {}, error);
}

export function SuccessResponse(data: {}) {
    return createGenericResponse(true, 'Successfully completed the request', data, {});
}