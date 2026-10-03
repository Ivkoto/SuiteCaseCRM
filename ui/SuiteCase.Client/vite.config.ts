import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

const target =
    env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
        : env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0]
        : 'https://localhost:7295';

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => {
    const developmentHttps = command === 'serve' && !isPreview
        ? getDevelopmentHttpsOptions()
        : undefined;

    return {
        plugins: [plugin()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        server: {
            host: 'localhost',
            allowedHosts: ['.devtunnels.ms'],
            proxy: {
                '/api': { target, secure: false },
                '/swagger': { target, secure: false },
                '/openapi': { target, secure: false }
            },
            port: parseInt(env.DEV_SERVER_PORT || '54479'),
            strictPort: true,
            https: developmentHttps
        }
    };
})

function getDevelopmentHttpsOptions() {
    const baseFolder = env.APPDATA !== undefined && env.APPDATA !== ''
            ? `${env.APPDATA}/ASP.NET/https`
            : `${env.HOME}/.aspnet/https`;
    const certificateName = "SuiteCase.client";
    const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
    const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true });
    }

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        if (0 !== child_process.spawnSync('dotnet', [
            'dev-certs',
            'https',
            '--export-path',
            certFilePath,
            '--format',
            'Pem',
            '--no-password',
        ], { stdio: 'inherit', }).status) {
            throw new Error("Could not create certificate.");
        }
    }

    return {
        key: fs.readFileSync(keyFilePath),
        cert: fs.readFileSync(certFilePath),
    };
}
