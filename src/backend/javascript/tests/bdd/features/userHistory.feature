Feature: User reservation history

  Scenario: Get all reservations for a user
    Given the user has an active and a cancelled reservation
    When the user requests their complete reservation history
    Then the system returns a list with both reservations

  Scenario: Filter only active reservations
    Given the user has an active and a cancelled reservation
    When the user requests only active reservations
    Then the system returns a list with only the active reservation