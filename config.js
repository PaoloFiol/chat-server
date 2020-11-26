const config = {
    server: {
        host: 'localhost',
        port: process.env.PROD ==1 ? process.env.PORT: 8080,
        websocketPort: 8081
    }
};

module.exports = config;