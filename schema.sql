s
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  company VARCHAR(255),
  blog VARCHAR(255),
  location VARCHAR(255),
  email VARCHAR(255),
  bio TEXT,
  public_repos INT DEFAULT 0,
  public_gists INT DEFAULT 0,
  followers INT DEFAULT 0,
  following INT DEFAULT 0,
  profile_type VARCHAR(50),
  github_created_at DATETIME,
  github_updated_at DATETIME,
  profile_url VARCHAR(255),
  avatar_url VARCHAR(255),
  popularity_score INT DEFAULT 0,
  analysis_date DATETIME,
  raw_data TEXT
);
