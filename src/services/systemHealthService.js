const os = require('os');
const prisma = require('../config/prisma');

class SystemHealthService {
    constructor() {
        this.cpuUsage = 0;
        this.startCpuMonitoring();
    }

    startCpuMonitoring() {
        let startCpus = os.cpus();

        setInterval(() => {
            const endCpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;

            for (let i = 0; i < startCpus.length; i++) {
                const cpu1 = startCpus[i];
                const cpu2 = endCpus[i];

                const idle = cpu2.times.idle - cpu1.times.idle;
                let total = 0;
                for (let type in cpu2.times) {
                    total += cpu2.times[type] - cpu1.times[type];
                }

                totalIdle += idle;
                totalTick += total;
            }

            const idleStats = totalIdle / startCpus.length;
            const totalStats = totalTick / startCpus.length;
            
            // Calculate percentage
            const percentage = totalStats > 0 ? ((1 - (idleStats / totalStats)) * 100).toFixed(2) : 0;
            this.cpuUsage = percentage;

            // Reset start point
            startCpus = endCpus;
        }, 2000); // Update every 2 seconds
    }

    async getHealthStats() {
        const start = Date.now();
        let dbStatus = 'disconnected';
        let dbLatency = -1;

        try {
            await prisma.$queryRaw`SELECT 1`;
            dbLatency = Date.now() - start;
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
        }

        const stats = {
            system: {
                arch: os.arch(),
                platform: os.platform(),
                release: os.release(),
                hostname: os.hostname(),
                uptime: os.uptime(), // seconds
                cores: os.cpus().length,
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                usagePercentage: ((1 - (os.freemem() / os.totalmem())) * 100).toFixed(2)
            },
            cpu: {
                loadAvg: os.loadavg(), // Native loadavg (works on Linux/Mac)
                usagePercentage: this.cpuUsage // Real-time calc (works on Windows too)
            },
            process: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                pid: process.pid
            },
            database: {
                status: dbStatus,
                latency: dbLatency + 'ms'
            },
            timestamp: new Date()
        };

        return stats;
    }
}

module.exports = new SystemHealthService();
