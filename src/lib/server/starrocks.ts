import mysql from 'mysql2/promise';
import {
	STARROCKS_DATABASE,
	STARROCKS_HOST,
	STARROCKS_PASSWORD,
	STARROCKS_PORT,
	STARROCKS_QUERY_TIMEOUT_S,
	STARROCKS_USER
} from '$app/env/private';

const pool = mysql.createPool({
	host: STARROCKS_HOST,
	port: STARROCKS_PORT,
	user: STARROCKS_USER,
	password: STARROCKS_PASSWORD,
	database: STARROCKS_DATABASE,
	connectionLimit: 8,
	connectTimeout: 5_000,
	decimalNumbers: true,
	dateStrings: true
});

pool.pool.on('connection', (connection) => {
	connection.query(`SET query_timeout = ${STARROCKS_QUERY_TIMEOUT_S}`, (error) => {
		if (!error) return;
		console.error(JSON.stringify({ level: 'error', source: 'starrocks', message: error.message }));
		connection.destroy();
	});
});

export async function query<Row>(
	sql: string,
	params: (string | number | null)[] = []
): Promise<Row[]> {
	const [rows] = await pool.query(sql, params);
	return rows as Row[];
}
