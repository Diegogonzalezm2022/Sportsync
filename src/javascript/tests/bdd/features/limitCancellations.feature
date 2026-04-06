Feature: Limit cancellations per client

  Scenario: Client cancels within the allowed limit
    Given a client has made 2 cancellations this month
    And the cancellation limit per month is 3
    When the client cancels a booking
    Then the cancellation is accepted

  Scenario: Client reaches the cancellation limit
    Given a client has made 3 cancellations this month
    And the cancellation limit per month is 3
    When the client cancels a booking
    Then the cancellation is rejected

  Scenario: Cancellation limit resets the following month
    Given a client has made 3 cancellations this month
    And the cancellation limit per month is 3
    And a new month has started
    When the client cancels a booking
    Then the cancellation is accepted