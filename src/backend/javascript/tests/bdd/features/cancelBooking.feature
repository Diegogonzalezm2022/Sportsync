Feature: Cancel a booking
  Scenario: User cancels an active reservation
    Given the user has an active reservation
    When the user cancels the reservation
    Then the reservation status is cancelled in the database