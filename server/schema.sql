CREATE TABLE StudySessions (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  sessionDate DATE NOT NULL,
  minutes INT NOT NULL,
  category NVARCHAR(50) NOT NULL,
  customLabel NVARCHAR(100) NULL,
  note NVARCHAR(255) NULL,
  sessionTime NVARCHAR(20) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_StudySessions_sessionDate ON StudySessions(sessionDate);

CREATE TABLE AppSettings (
  [key] NVARCHAR(50) PRIMARY KEY,
  [value] NVARCHAR(200) NOT NULL
);
