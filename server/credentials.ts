import fs from 'fs';
import path from 'path';

// Credentials files that are needed will be auto-generated in this folder when you run the app.
// You can edit them as needed.

export default function getCredentials(namespace: String, key: string): string | undefined {
    // load credentials from file
    const current_file_dir = __dirname;
    const filename = path.join(current_file_dir, 'credentials', `${namespace}.json`);
    const file_exists = fs.existsSync(filename);
    if(file_exists) {
        const file_contents = fs.readFileSync(filename);
        // expect JSON error
        let credentials: Record<string, string> = {};
        try {
            credentials = JSON.parse(file_contents.toString()) as Record<string, string>;
        } catch(e) {
            if(e instanceof SyntaxError) {
                console.error(`** Error parsing credentials file: ${filename}`);
                console.error(e);
                return undefined;
            }
        }
        if(credentials[key] === undefined) {
            console.error(`** Error: missing key ${key} in credentials file, please edit: ${filename}`);
            credentials[key] = "";
            fs.writeFileSync(filename, JSON.stringify(credentials, null, 4));
        }
        return credentials[key]
    } else {
        // create credentials file
        console.warn("** Auto-creating missing credentials file, please edit:", filename);

        const folder = path.dirname(filename);
        if(!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        fs.writeFileSync(filename, JSON.stringify({key: ""}, null, 4));

        return undefined;
    }
}
