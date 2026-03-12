const sql = require("mssql");

const dbConfig = {
  server: "YERLIN\\SQLEXPRESS",
  database: "StudyTracker",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  port: 1433,
  authentication: {
    type: "default",
    options: {
      integratedSecurity: true,
    },
  },
};

async function testConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Conexión exitosa a la base de datos");
    pool.close();
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  }
}

testConnection();