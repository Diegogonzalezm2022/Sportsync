Feature: Cancelling a reservation updates its activity's slots
  Scenario: User cancels an active reservation
    Given the user has an active reservation
    When the user cancels the reservation
    Then the activity's available slots are increased by one