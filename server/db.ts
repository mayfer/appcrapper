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
}

export async function addToWaitlist(email: string) {
    await db.exec(`INSERT INTO waitlist (email) VALUES (?) ON CONFLICT DO NOTHING`, [email]);
}

initDb()