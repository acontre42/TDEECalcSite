-- CREATE DATABASE subscriber_list;

-- Frequency of reminders
CREATE TABLE frequency(
    id SERIAL PRIMARY KEY,
    descriptor VARCHAR(10) NOT NULL,
    num_days SMALLINT NOT NULL
);

INSERT INTO frequency (descriptor, num_days)
VALUES
    ('monthly', 30),
    ('bimonthly', 60),
    ('quarterly', 90),
    ('biannually', 182),
    ('yearly', 365);


CREATE TABLE subscriber(
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) UNIQUE NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT false,   -- false = pending subscriber
    frequency_id INT REFERENCES frequency NOT NULL,
    date_subscribed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE measurement_system_type AS ENUM ('imperial', 'metric');
CREATE TYPE sex_type AS ENUM ('F', 'M');

CREATE TABLE subscriber_measurements(
    sub_id INT PRIMARY KEY REFERENCES subscriber,
    sex sex_type NOT NULL,
    age SMALLINT NOT NULL,
    measurement_system measurement_system_type NOT NULL,
    weight_value DECIMAL(3,3) NOT NULL,   -- lbs or kg determined by measurement_system_type
    height_value DECIMAL (3,3) NOT NULL, -- inches or cm determined by measurement_system_type
    est_tdee INT NOT NULL,  -- estimated TDEE
    est_bmr INT NOT NULL,   -- estimated BMR
    date_last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
-- TABLES NEEDED: 
    confirmation code, 
    scheduled reminders (trigger creation after updating confirmed to true in subscriber table or after updating date_last_updated in subscriber_measurements),
    update codes (to avoid using predictable ids in links to update measurements)

-- Confirmation email code expires 30 days after date_sent. (Unsub/delete?)
CREATE TABLE confirmation_code(
    sub_id INT PRIMARY KEY REFERENCES subscriber,
    code INT UNIQUE NOT NULL,
    date_sent TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expires TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- once date_scheduled arrives, create update_code, send update email, update date of next reminder
CREATE TABLE scheduled_reminder(
    sub_id INT PRIMARY KEY REFERENCES subscriber,
    date_scheduled TIMESTAMP NOT NULL
);

CREATE TABLE update_code(
    sub_id INT PRIMARY KEY REFERENCES subscriber,
    code INT UNIQUE NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMSTAMP
);
*/