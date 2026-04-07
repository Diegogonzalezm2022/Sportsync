Feature: Limit cancellations per client

  Scenario: Client cancels before the cancellation deadline
    Given the user has an active reservation
    And the activity has a cancellation deadline in the future
    When the user cancels the reservation
    Then the cancellation is accepted

  Scenario: Client cancels after the cancellation deadline
    Given the user has an active reservation
    And the activity has a cancellation deadline in the past
    When the user cancels the reservation
    Then the cancellation is rejected