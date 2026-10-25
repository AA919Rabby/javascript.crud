export const autoBroadcast = (io) => {
    return (req, res, next) => {
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

        if (isMutation) {
            const originalJson = res.json;

            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
                    const endpoint = req.originalUrl;
                    const method = req.method;

                    console.log(`⚡ [AUTO-BROADCAST] ${method} ${endpoint}`);

                    // 🌟 Pushes to all Flutter phones, Websites, and Admin Dashboards:
                    io.emit("LIVE_DATABASE_UPDATE", {
                        endpoint,
                        method,
                        data: body.data || body,
                        timestamp: new Date(),
                    });
                }

                return originalJson.call(this, body);
            };
        }

        next();
    };
};