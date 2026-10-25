module.exports = {
    apps: [
        {
            name: "node-cluster",
            script: "src/server.js",
            instances: 3, // 🌟 Starts 3 independent Node.js processes!
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 5000,
            },
        },
    ],
};