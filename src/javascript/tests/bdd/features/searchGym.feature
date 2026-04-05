Feature: Search gyms by location
  Scenario: Gyms are found near a location
    Given there is a gym near coordinates 40.0 and -3.0
    When the user searches for gyms within 10 km of 40.0 and -3.0
    Then the gym appears in the search results
    
  Scenario: Gyms are found at a vertical distance from a location
    Given there is a gym near coordinates 40.0 and -3.0
    When the user searches for gyms within 10 km of 40.05 and -3.0
    Then the gym appears in the search results

  Scenario: Gyms are found at a horizontal distance from a location
    Given there is a gym near coordinates 40.0 and -3.0
    When the user searches for gyms within 10 km of 40.0 and -3.117
    Then the gym appears in the search results

  Scenario: Gyms are found at a diagonal distance from a location
    Given there is a gym near coordinates 40.04 and -3.1
    When the user searches for gyms within 10 km of 40.0 and -3.0
    Then the gym appears in the search results

  Scenario: Gym does not appear when further than introduced  distance
    Given there is a gym near coordinates 40.04 and -3.1
    When the user searches for gyms within 1 km of 40.0 and -3.0
    Then the gym does not appear in the search results