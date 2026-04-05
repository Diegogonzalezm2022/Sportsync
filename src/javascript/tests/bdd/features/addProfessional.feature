Feature: Adding new professionals to the system

  Scenario: New professional is added
    Given the data of a new professional
    When the professional is added to the system
    Then the new professional appears on the database