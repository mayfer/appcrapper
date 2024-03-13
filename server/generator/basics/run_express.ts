
import http from "http";
import { Server } from "socket.io";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import esbuild from 'esbuild';
import fs from 'fs';

export const app = express();
export const server = http.createServer(app);
export const io = new Server(server);

app.use(express.json());
app.use(cookieParser());

app.get('/client/:file', (req, res) => {
    const filepath = path.join(__dirname, '../client', req.params.file);
    res.sendFile(filepath);
})
app.get('/dist/:file', (req, res) => {
    const filepath = path.join(__dirname, '../dist', req.params.file);
    res.sendFile(filepath);
})
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

/* running the http server is handled here. it does not need to be ran again */
const port = process.env.PORT || 8001;
server.listen(port, () => {
    console.log('Server is running on port ' + port);
    console.log('Open http://localhost:' + port + ' in your browser.');
});

/* PROMPT_IGNORE */

(async () => {

    const folder: string = path.join(__dirname, '../');
    const client_entry = fs.existsSync(path.join(folder, 'client/index.tsx')) ? 'client/index.tsx' : 'client/index.ts';
    fs.mkdirSync(path.join(folder, 'dist'), { recursive: true });
    const result = await esbuild.build({
        entryPoints: [path.join(folder, client_entry)],
        outdir: path.join(folder, 'dist'),
        bundle: true,
        write: false,
    });

    fs.watch(path.join(folder, 'client'), { recursive: true }, async (event, filename) => {
        const result = await esbuild.build({
            entryPoints: [path.join(folder, client_entry)],
            outdir: path.join(folder, 'dist'),
            bundle: true,
        });
    });

    const files = result.outputFiles ? result.outputFiles.map(output => {
        const basename: string = path.basename(output.path);
        const ext: string = path.extname(basename).slice(1);

        const filePath = path.join(folder, 'dist', path.basename(output.path));
        fs.writeFileSync(filePath, output.contents);

        return {
            path: output.path,
            basename,
            extension: ext,
        };
    }) : [];

    if(files.length == 0) {
        console.error('Failed to build client', client_entry, result);
    }


    const index_html_content = `<!doctype html>
    <html>
      ${files.filter(f => f.extension == 'css').map(f => `
      <link rel="stylesheet" href="/dist/${f.basename}" />
      `.trim()).join('\n')}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="module">
        ${files.filter(f => f.extension == 'js').map(f => `import '/dist/${f.basename}';`).join('\n')}
      </script>
      <div id="root"></div>
    </html>`;


    await Bun.write(folder + '/server/index.html', index_html_content);

})();
