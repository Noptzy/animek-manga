class resHandler {
    constructor(success, message, data = null) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(message = 'Success', data = null, statusCode = 200) {
        return new resHandler(true, message, data);
    }

    static error(message = 'Error', data = null, statusCode = 500) {
        return new resHandler(false, message, data);
    }

    toJSON() {
        const response = {
            success: this.success,
            message: this.message,
            creator: "Nostzy",
        };

        if (this.data && typeof this.data === 'object' && 'totalPages' in this.data && 'mangas' in this.data) {
            response.data = this.data.mangas;
            response.total = this.data.total;
            response.page = this.data.page;
            response.limit = this.data.limit;
            response.totalPages = this.data.totalPages;
        } else {
            response.data = this.data;
        }

        return response;
    }
}

module.exports = resHandler;