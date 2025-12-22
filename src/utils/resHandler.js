class resHandler {
    constructor(success, message, data = null) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(message = 'Success', data = null) {
        return new resHandler(true, message, data);
    }

    static error(message = 'Error', data = null) {
        return new resHandler(false, message, data);
    }

    toJSON() {
        const response = {
            success: this.success,
            message: this.message,
            creator: 'Nostzy',
        };

        if (
            this.data &&
            typeof this.data === 'object' &&
            Array.isArray(this.data.data) &&
            typeof this.data.total === 'number' &&
            typeof this.data.page === 'number' &&
            typeof this.data.limit === 'number' &&
            typeof this.data.totalPages === 'number'
        ) {
            response.data = this.data.data;
            response.total = this.data.total;
            response.page = this.data.page;
            response.limit = this.data.limit;
            response.totalPages = this.data.totalPages;
        }
        else {
            response.data = this.data;
        }

        return response;
    }
}

module.exports = resHandler;
