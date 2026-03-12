-- Crear tabla StudySessions
CREATE TABLE "StudySessions" (
    "id" SERIAL PRIMARY KEY,
    "sessionDate" DATE NOT NULL,
    "minutes" INT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "customLabel" VARCHAR(100),
    "note" VARCHAR(255),
    "sessionTime" VARCHAR(20),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para la columna sessionDate
CREATE INDEX "IX_StudySessions_sessionDate" ON "StudySessions"("sessionDate");

-- Crear tabla AppSettings
CREATE TABLE "AppSettings" (
    "key" VARCHAR(50) PRIMARY KEY,
    "value" VARCHAR(200) NOT NULL
);