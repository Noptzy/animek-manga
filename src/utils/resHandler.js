class resHandler {
    constructor(success, message, data = null){
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(message = 'Success', data = null, statusCode = 200){
        return new resHandler(true, message, data);
    }

    static error(message = 'Error', data = null, statusCode = 500){
        return new resHandler(false, message, data);
    }

    toJSON(){
        return {
            success: this.success,
            message: this.message,
            creator: "Nostzy",
            data: this.data?.data || this?.data,
            page: this.data?.page,
            totalPage: this.data?.totalPage,
            total: this.data?.total,

        }
    }
}

module.exports = resHandler;