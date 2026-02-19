const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env) => {
    const browser = env.browser || 'chrome';

    const manifestMap = {
        chrome: 'manifest.v3.json',
        edge: 'manifest.v3.json',
        firefox: 'manifest.v2.json',
        safari: 'manifest.safari.json',
    };

    const manifestFile = manifestMap[browser] || manifestMap.chrome;

    return {
        mode: 'production',
        devtool: 'source-map',
        entry: {
            'background/main.background': './src/background/main.background.ts',
            'content/link-scanner': './src/content/link-scanner.ts',
            'content/tooltip': './src/content/tooltip.ts',
            'content/overlay': './src/content/overlay.ts',
            'popup/main': './src/popup/main.ts',
        },
        output: {
            path: path.resolve(__dirname, `dist/${browser}`),
            filename: '[name].js',
            clean: true,
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            alias: {
                '@engine': path.resolve(__dirname, 'src/engine/'),
                '@services': path.resolve(__dirname, 'src/services/'),
                '@models': path.resolve(__dirname, 'src/engine/models/'),
                '@data': path.resolve(__dirname, 'src/engine/data/'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'sass-loader',
                    ],
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                    ],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: 'styles/[name].css',
            }),
            new HtmlWebpackPlugin({
                template: './src/popup/index.html',
                filename: 'popup/index.html',
                chunks: ['popup/main'],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: `src/manifest/${manifestFile}`,
                        to: 'manifest.json',
                    },
                    {
                        from: 'icons/',
                        to: 'icons/',
                        noErrorOnMissing: true,
                    },
                    {
                        from: '_locales/',
                        to: '_locales/',
                    },
                    {
                        from: 'src/pages/',
                        to: 'pages/',
                    },
                    {
                        from: 'src/engine/data/',
                        to: 'data/',
                    },
                ],
            }),
        ],
        optimization: {
            splitChunks: {
                chunks(chunk) {
                    // Don't split content scripts or background
                    return chunk.name === 'popup/main';
                },
            },
        },
    };
};
