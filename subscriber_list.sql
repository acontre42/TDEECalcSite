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
    freq_id INT REFERENCES frequency NOT NULL,
    date_subscribed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN NOT NULL DEFAULT false,   -- false = pending subscriber
    date_confirmed TIMESTAMP
);


CREATE TYPE measurement_system_type AS ENUM ('imperial', 'metric');
CREATE TYPE sex_type AS ENUM ('female', 'male');

CREATE TABLE subscriber_measurements(
    sub_id INT PRIMARY KEY REFERENCES subscriber ON DELETE CASCADE,
    sex sex_type NOT NULL,
    age SMALLINT NOT NULL,
    measurement_sys measurement_system_type NOT NULL,
    weight_value DECIMAL(6,3) NOT NULL,   -- lbs or kg determined by measurement_system_type
    height_value DECIMAL (6,3) NOT NULL, -- inches or cm determined by measurement_system_type
    est_bmr INT NOT NULL,   -- estimated BMR
    est_tdee INT NOT NULL,  -- estimated TDEE
    date_last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Confirmation email code expires 7 days after date_sent.
-- NOTES:
-- on expiration date, delete all records associated with subscriber id in database
-- if subscriber clicks on confirmation link, subscriber.confirmed = true, set date_confirmed, delete row in confirmation_code, create row in scheduled_reminder
CREATE TABLE confirmation_code(
    sub_id INT PRIMARY KEY REFERENCES subscriber ON DELETE CASCADE,
    code INT UNIQUE NOT NULL,
    date_sent TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expires TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

CREATE INDEX confirm_exp_index ON confirmation_code (date_expires);


-- Unsubscribe code expires 24 hours after date_created.
CREATE TABLE unsubscribe_code(
    sub_id INT PRIMARY KEY REFERENCES subscriber ON DELETE CASCADE,
    code INT UNIQUE NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expires TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);


-- If user is already subscribed/confirmed and tries to subscribe again, send update confirmation email to confirm update to subscriber_measurements.
-- Pending update expires 30 minutes after date_created.
CREATE TABLE pending_update(
    sub_id INT PRIMARY KEY REFERENCES subscriber ON DELETE CASCADE,
    code INT UNIQUE NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expires TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
    sex sex_type NOT NULL,
    age SMALLINT NOT NULL,
    measurement_sys measurement_system_type NOT NULL,
    weight_value DECIMAL(6,3) NOT NULL,
    height_value DECIMAL (6,3) NOT NULL,
    est_bmr INT NOT NULL,
    est_tdee INT NOT NULL
);


CREATE TYPE email_category_type AS ENUM ('email confirmation', 'reminder', 'update confirmation', 'unsubscribe');
-- Any time an email is sent, it should be recorded in email_sent table.
CREATE TABLE email_sent(
    id SERIAL PRIMARY KEY,
    date_sent TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category email_category_type NOT NULL,
    recipient VARCHAR(200) NOT NULL,
    subject TEXT NOT NULL,
    contents TEXT NOT NULL
);