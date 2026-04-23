Feature: Book a gym activity

  Scenario: User books an available activity
    Given there is an activity with available slots
    When the user books the activity
    Then the reservation appears in the database with status active
