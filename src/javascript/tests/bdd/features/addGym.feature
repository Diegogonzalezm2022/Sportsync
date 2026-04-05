Feature: Adding new gyms to the system

  Scenario: New gym is added
    Given the data of a new gym
    When this data is added to the system
    Then the new gym appears on the database