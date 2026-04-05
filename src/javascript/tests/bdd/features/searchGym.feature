Feature: Search gyms by location
  Scenario: Gyms are found near a location
    Given there is a gym near coordinates 40.0 and -3.0
    When the user searches for gyms within 10 km of 40.0 and -3.0
    Then the gym appears in the search results