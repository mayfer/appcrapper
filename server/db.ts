import { Database } from "bun:sqlite";
import path from 'path';

const file = path.join(__dirname, '../db.sqlite');
export const db = new Database(file);

export async function initDb() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS apps (
            app_id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            file_id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
        );
    `);
}

export async function addToWaitlist(email: string) {
    await db.exec(`INSERT INTO waitlist (email) VALUES (?) ON CONFLICT DO NOTHING`, [email]);
}

initDb()