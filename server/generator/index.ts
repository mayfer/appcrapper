import { stream } from './claude';
import { Prompt, Line } from './interfaces';
import file_saver from './file_saver';
import path from 'path';
import fs from 'fs';


export default async function generate(app_id: string, app_desc: string, api_key: string, streamFileHandler: (stream: any, filename: string, text: string, replace?: boolean) => void) {

  const run_express_file = await Bun.file(__dirname + '/basics/run_express.ts').text();

  const run_express_file_prompt = run_express_file.split('/* PROMPT_IGNORE */')[0];

  const prompt: Prompt = {
    lines: [
      {
        role: 'user',
        content: `

You generate full working software by defining each file labelled with its file path. All functions must be fully implemented. The answer will be long and complete.
        
Please generate the following app: ${app_desc}

- You must not respond with speech, just start printing file contents
- Before each file, write a comment formatted like this wrapped with forward slash and star: /* FILE: path/to/file.js */
- At the end of the file, write a comment marking it like so: /* END_FILE */
- If there are no more files to write, mark it with /* END_APP */
- Make sure all files are implemented.
- Start with a README file that lists all routes and their descriptions.
- At the very end, generate a package.json file with all used libraries for both server and client. Don't specify version numbers, just use the latest version. Do NOT generate tsconfig.json.

For this project, you will generate both backend and frontend code, both in TypeScript.
The backend will use Node.js in Typescript + sqlite for database (sqlite3 library), and the frontend will use React 18. The server should create all necessary database tables and handle all database operations.
Server files should go under the "server" directory, and client files should go under the "client" directory.
The entry points for both the backend should be called "server/index.ts" and for the frontend "client/index.tsx". The css file should be called "client/index.css". You can also use tailwindcss if you like.
Request and response types (DTO) will be described in a shared folder called "shared".

Start by generating README.md first. The only needed command is "bun server/run.ts", which is already provided below.

You must generate the types first, so that the backend and frontend can refer to them for implementation.
For the server, you can put all business logic into API handlers.
The server and client are on the same port, you can use / as root path for endpoints.
The react root should attach to <div id="root"></div>. You don't need to provide the html file.

The app should be ready to run, complete with all functionality.

The server is already running on port 8001 with express and socket.io.
/* FILE: ./server/run_express.ts */

${run_express_file_prompt}

/* END_FILE */

`.trim(),
      },
    ],
  };

  let running = true;
  const appname = 'app-' + app_id;

  const generated_files: { [path: string]: string } = {};

  while (running) {
    let response_so_far = '';
    let file_content_so_far = '';
    let current_file: string | null = null;
    const streamHandler = (stream: any, text: string, stopSequence: string | undefined) => {

      if (response_so_far.includes('/* FILE: ')) {
        const regex = /\/\* FILE: (?<filename>[^\s]*?) \*\//g;
        const matches = response_so_far.matchAll(regex);

        for (const match of matches) {
          if (match.groups) {
            current_file = match.groups.filename;
            if (current_file.startsWith('./')) {
              current_file = current_file.substring(2);
            }
          }
        }

      }
      response_so_far += text;

      if (current_file) {
        streamFileHandler(stream, current_file, text);
        file_content_so_far += text;
        generated_files[current_file] = file_content_so_far.replace(/\/\* FILE: [^\s]* \*\//gm, '');
      }
    }

    try {
      const response = await stream(prompt, api_key, streamHandler);
      prompt.lines.push({
        role: 'assistant',
        content: response.text,
      });
      prompt.lines.push({
        role: 'user',
        content: `OK. print next file, if any. You can say /* FINISHED */ when done.`,
      });

      if (response.stopSequence?.includes('/* FINISHED') || response.stopSequence?.includes('/* END_APP */')) {
        running = false;
      }
      file_saver(appname, response.text);
    } catch (e) {
      // console.error(e);
      console.log("(API down, retrying in 1s)");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if(generated_files['package.json']) {
    // remove /* FINISHED */ from package.json
    try {
      const package_json = JSON.parse(generated_files['package.json']);
      package_json.dependencies['esbuild'] = 'latest';
      package_json.dependencies['socket.io'] = 'latest';
      package_json.dependencies['socket.io-client'] = 'latest';
      package_json.dependencies['cookie-parser'] = 'latest';
      package_json.dependencies['express'] = 'latest';
      
      generated_files['package.json'] = JSON.stringify(package_json, null, 4);
      streamFileHandler(null, 'package.json', generated_files['package.json'], true);
      console.log('package.json updated');
      console.log(generated_files['package.json']);
    } catch (e) {
      console.error(e);
    }
  }

  if (!generated_files['server/index.ts']) {
    const default_server_index = `
import { app, io } from './run_express';
app.get("/robots.txt", (req, res) => {
  res.send("who's the robot here?");
});
  `.trim();
    streamFileHandler(null, 'server/index.ts', default_server_index);
    await Bun.write('generated_apps/' + appname + '/server/index.ts', default_server_index);

  }

  streamFileHandler(null, 'server/run_express.ts', run_express_file);


  await Bun.write('generated_apps/' + appname + '/server/run_express.ts', run_express_file);
  const folder = path.join(__dirname, '../../generated_apps/', appname);
  const client_entry = fs.existsSync(path.join(folder, 'client/index.tsx')) ? 'client/index.tsx' : 'client/index.ts';
  
  const files : any[] = [];
  try {
    const build = await Bun.build({
      entrypoints: [path.join(folder, client_entry)],
      outdir: path.join(folder, 'dist/'),
    });


    build.outputs.forEach(output => {
      const basename = path.basename(output.path);
      const ext = path.extname(basename).slice(1);

      files.push({
        path: output.path,
        basename,
        extension: ext,
      });
    });
  } catch (e) {
    console.error('Error building client', folder, client_entry);
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

  streamFileHandler(null, 'index.html', index_html_content);
  await Bun.write('generated_apps/' + appname + '/server/index.html', index_html_content);

  // console.log(`\nDone. "bun generated_apps/${appname}/server/index.ts" to start the server.`);


};


// (async () => {
//   await main();
//   process.exit(0);
// })();

