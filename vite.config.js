import * as path from "path"
import { defineConfig } from "vite"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"

/** @type {import('vite').UserConfig} */
export default defineConfig(() => {
    return {
        root: path.resolve(__dirname, "src"),
        publicDir: path.resolve(__dirname, "public"),
        css: {
            transformer: "lightningcss",
        },
        build: {
            outDir: "../dist",
            emptyOutDir: true,
            assetsDir: "",
            sourcemap: true,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, "src/index.html"),
                    win_settings: path.resolve(__dirname, "src/window_contents/win_settings.html"),
                    win_social: path.resolve(__dirname, "src/window_contents/win_social.html"),
                    dvd_main: path.resolve(__dirname, "src/dvd/index.html"),
                    dvd_popup: path.resolve(__dirname, "src/dvd/dvd.html"),
                    newYear: path.resolve(__dirname, "src/newYear/index.html"),
                },
            }
        },
        server: {
            open: false,
            port: 80,
            strictPort: true,
            host: '127.0.0.1'
        },
        plugins: [
            ViteImageOptimizer({
                png: {quality: 50},
                webp: {quality: 60},
                jpg: {quality: 70},
                jpeg: {quality: 70},
                svg: {quality: 80},
                gif: {quality: 50}
            })
        ]
    }
})