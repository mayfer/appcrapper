
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
        bundle: true, // Assuming you want to bundle
    });

    // watch for changes in the client folder
    // using fs tools
    fs.watch(path.join(folder, 'client'), { recursive: true }, async (event, filename) => {

        const result = await esbuild.build({
            entryPoints: [path.join(folder, 'client/index.tsx')],
            outdir: path.join(folder, 'dist'),
            bundle: true, // Assuming you want to bundle
        });
    });

    if(result.errors.length > 0) {
        console.error(result.errors);
        return;
    }
    if(!result.outputFiles) {
        console.error('No output files');
        return;
    }

    // Assuming 'result.outputFiles' is what you want to map, following the esbuild 'write: false' behavior
    const files = result.outputFiles.map(output => {
        const basename: string = path.basename(output.path);
        const ext: string = path.extname(basename).slice(1);

        return {
            path: output.path,
            basename,
            extension: ext,
        };
    });


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
