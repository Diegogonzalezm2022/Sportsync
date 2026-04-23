Feature: Making a reservation updates its activity's available slots
  Scenario: User books an available activity
    Given there is an activity with available slots
    When the user books the activity
    Then the activity's available slots are reduced by one