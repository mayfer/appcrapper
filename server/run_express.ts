
import http from "http";
import { Server } from "socket.io";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import * as esbuild from 'esbuild';
import * as fs from 'fs';

export const app = express();
export const server = http.createServer(app);
export const io = new Server(server);

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send(`<!doctype html>
    <html>
      <link rel="stylesheet" href="/dist/index.css" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="module">
        import '/dist/index.js';
      </script>
      <div id="root"></div>
    </html>`);
});

// serve static files
app.get('/dist/:file', (req, res) => {
    // res.sendFile(__dirname + '../client/' + req.params.file);
    const filepath = path.join(__dirname, '../dist', req.params.file);
    try {
        res.sendFile(filepath);
    } catch (e) {
        res.send("");
    }
})
// serve static files
app.get('/client/:file', (req, res) => {
    // res.sendFile(__dirname + '../client/' + req.params.file);
    const filepath = path.join(__dirname, '../client', req.params.file);
    try {
        res.sendFile(filepath);
    } catch (e) {
        res.send("");
    }
})

const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log('Server is running on port ' + port);
});


(async () => {

    const folder: string = path.join(__dirname, '../');
    const result = await esbuild.build({
        entryPoints: [path.join(folder, 'client/index.tsx')],
        outdir: path.join(folder, 'dist'),
        bundle: true,
    });

    fs.watch(path.join(folder, 'client'), { recursive: true }, async (event, filename) => {

        const result = await esbuild.build({
            entryPoints: [path.join(folder, 'client/index.tsx')],
            outdir: path.join(folder, 'dist'),
            bundle: true,
        });
    });

})();
