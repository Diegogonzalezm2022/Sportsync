Feature: Adding activities
  Scenario: A gym adds an activity
    Given a gym that exists in the database
    When they create an activity
    Then the activity appears in the database

  Scenario: A professional adds an activity
    Given a professional that exists in the database
    When they create an activity
    Then the activity appears in the database