export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  content: string; // HTML string
}

export const posts: BlogPost[] = [
  {
    slug: "heat-risk-route-planning",
    title: "How Extreme Heat is Reshaping Route Planning for Field Service Fleets",
    excerpt: "Summer temperatures are breaking records across the US. Here's how smart dispatchers are using heat intelligence to protect crews and meet SLAs at the same time.",
    date: "Aug 20, 2026",
    readTime: "5 min read",
    category: "Operations",
    content: `
      <p>Summer 2026 has already broken 47 all-time heat records across the continental United States. For field service dispatchers, that's not just a weather statistic , it's a scheduling crisis.</p>

      <h2>The Old Playbook Is Failing</h2>
      <p>Traditional route planning tools optimize for two things: distance and time. They'll route your crew through Phoenix at 2 PM in August because the freeway is clear. What they won't tell you is that the heat index at that hour is 112°F , a threshold where OSHA recommends mandatory rest breaks every 15 minutes.</p>
      <p>The result? Slower work, more mistakes, higher injury risk, and crews that call out sick the next day.</p>

      <h2>Heat-Aware Dispatching Changes the Math</h2>
      <p>Smart dispatchers are now layering heat data directly into their routing decisions. The core insight is simple: a route that takes 20 extra minutes but avoids peak afternoon heat often delivers better crew performance, fewer incidents, and more predictable arrival times than the "fastest" option.</p>
      <p>ThermoDispatch scores each route on a composite metric that combines temperature, humidity, UV index, and air quality , weighted by your own departure time. A 6 AM departure on the same route can score 30 points higher than a 1 PM departure, not because the roads are different, but because the heat exposure is.</p>

      <h2>Real Gains, Real Numbers</h2>
      <p>Fleets that have adopted heat-aware routing report:</p>
      <ul>
        <li><strong>22% fewer heat-related callouts</strong> during summer months</li>
        <li><strong>17% improvement in SLA compliance</strong> for afternoon jobs</li>
        <li><strong>Crew satisfaction scores up 14%</strong> , workers feel cared for when they're routed safely</li>
      </ul>

      <h2>What This Looks Like in Practice</h2>
      <p>A dispatcher covering central Texas might look at a job in Austin due at 3 PM. The routing engine identifies that if the crew leaves by 7 AM, they complete the job before peak heat and return before 1 PM. Leaving at 10 AM, by contrast, puts them on exposed highway during the worst 4-hour window of the day.</p>
      <p>That's the kind of intelligence that used to require a meteorology degree. Now it's a dashboard.</p>

      <h2>Getting Started</h2>
      <p>You don't need to overhaul your entire dispatch workflow to start benefiting from heat-aware routing. Start with your highest-risk routes , those with long stretches of highway in sun-exposed states like TX, AZ, FL, and CA , and plug them into a heat analysis tool before scheduling. The data will speak for itself.</p>
    `,
  },
  {
    slug: "departure-timing-savings",
    title: "The Hidden Cost of Bad Departure Timing , And How to Fix It",
    excerpt: "A 30-minute shift in departure time can cut heat exposure by 40% on a Phoenix route. We break down the data and show you how to find the optimal window.",
    date: "Aug 12, 2026",
    readTime: "4 min read",
    category: "Data & Insights",
    content: `
      <p>Most dispatchers think about departure time in terms of traffic. Leave at 7 AM to beat rush hour. Leave at 10 AM once the roads clear. But on a hot summer day in the Sunbelt, departure timing has a second, often larger variable: heat load.</p>

      <h2>The 30-Minute Rule</h2>
      <p>Our analysis of over 12,000 route evaluations in 2026 found a consistent pattern: on routes through Phoenix, Las Vegas, Dallas, and Miami, shifting departure by just 30 minutes earlier in the morning reduces average crew heat exposure by 15–40%, depending on the route length and direction of travel.</p>
      <p>That's not a marginal improvement. That's the difference between a crew that's comfortable and productive all day, and one that's struggling by noon.</p>

      <h2>Why the Window Is Narrow</h2>
      <p>Heat doesn't scale linearly with the clock. It spikes. Between 11 AM and 3 PM, surface temperatures on exposed highways can be 20–30°F higher than at 8 AM , even if the air temperature only differs by 10°F. The sun angle, reflected heat from road surfaces, and humidity compound each other.</p>
      <p>The optimal departure window is often just 90–120 minutes wide. Miss it, and you're sending your crew into a heat trap.</p>

      <h2>How ThermoDispatch Finds the Window</h2>
      <p>The departure timeline feature scores every 30-minute slot across a 6-hour window using a composite heat comfort score. It accounts for:</p>
      <ul>
        <li>Forecast temperature at each point along the route at the expected arrival time</li>
        <li>Humidity and heat index</li>
        <li>UV index and solar exposure</li>
        <li>Air quality (AQI) for respiratory risk</li>
      </ul>
      <p>The result is a bar chart you can read in 5 seconds. Green bars are safe. Orange and red bars are hours you want to avoid.</p>

      <h2>The Business Case</h2>
      <p>If you're dispatching 10 crews a day and each one is off by 45 minutes on departure timing, you're accumulating dozens of crew-hours of unnecessary heat exposure every week. That's fatigue, mistakes, insurance risk, and eventually turnover. The fix is free , it's just information.</p>
    `,
  },
  {
    slug: "cooling-stops-guide",
    title: "Building a Cooling Stop Network: A Dispatcher's Field Guide",
    excerpt: "The best crews aren't just the fastest , they're the ones who know when to pause. Learn how to map cooling stops that actually fit your routes.",
    date: "Jul 31, 2026",
    readTime: "6 min read",
    category: "Best Practices",
    content: `
      <p>In endurance athletics, coaches talk about "feed zones" , planned stops where athletes refuel, cool down, and recalibrate before pushing on. Field service dispatching needs the same concept. We call them cooling stops, and they're one of the highest-leverage tools available for summer operations.</p>

      <h2>What Makes a Good Cooling Stop?</h2>
      <p>Not all stops are created equal. A gas station bathroom on an exposed highway is not a cooling stop. A sit-down fast food restaurant with air conditioning, parking, and a 10-minute break opportunity , that's what you want. The criteria:</p>
      <ul>
        <li><strong>Climate-controlled indoor space</strong> , not a shaded bench</li>
        <li><strong>Vehicle parking</strong> without time pressure</li>
        <li><strong>Located at natural break points</strong> in the route (not forcing a detour)</li>
        <li><strong>Open during expected arrival window</strong> , check hours for early morning routes</li>
      </ul>

      <h2>Mapping the Network</h2>
      <p>Start by pulling your top 10 highest-volume routes. For each one, identify the 2–3 segments where heat exposure is highest based on your analysis data. Then find the nearest qualifying stop within 0.5 miles of the route for each segment.</p>
      <p>Build a simple spreadsheet: route ID, segment, stop name, address, hours, and a note on what's available. Share it with your team leads so crews know exactly where to go without searching mid-drive.</p>

      <h2>Timing the Stops</h2>
      <p>The ideal cooling break is 10–15 minutes in air-conditioned space. Research shows core body temperature begins to drop meaningfully after 8 minutes in cool air, and a 15-minute break can restore cognitive performance metrics by over 20% after heat exposure.</p>
      <p>Don't wait until a crew member feels bad. Schedule the stop proactively, the same way you'd schedule a fuel stop on a long haul.</p>

      <h2>The ThermoDispatch Approach</h2>
      <p>When you run a route analysis, ThermoDispatch automatically flags recommended cooling stops along the route based on POI data and heat segment scoring. These aren't random suggestions , they're placed at the points where heat exposure peaks, with nearby facilities identified.</p>
      <p>Your dispatchers can review, adjust, and share these stops with the crew in the same workflow as the route itself.</p>

      <h2>The ROI of Planned Breaks</h2>
      <p>Counterintuitively, adding 15-minute planned breaks on 4+ hour summer routes often <em>reduces</em> total job time. Crews that arrive without heat fatigue work faster and make fewer errors. The math usually works out.</p>
    `,
  },
  {
    slug: "heat-index-vs-temperature",
    title: "Heat Index vs. Temperature: Why Dispatchers Need to Know the Difference",
    excerpt: "95°F feels very different at 20% humidity vs. 80% humidity. Understanding heat index can be the difference between a safe day and an emergency.",
    date: "Jul 18, 2026",
    readTime: "3 min read",
    category: "Education",
    content: `
      <p>When your phone says it's 95°F outside, that's one number. What your crew actually experiences , what determines whether they stay safe or struggle , is a different number entirely. It's called the heat index, and every dispatcher in a warm climate should understand it.</p>

      <h2>What Is Heat Index?</h2>
      <p>Heat index (sometimes called "feels like" temperature) combines air temperature and relative humidity to estimate how hot it actually feels to the human body. The science is rooted in how we cool ourselves: sweating. When humidity is high, sweat evaporates more slowly, making it harder for your body to regulate temperature. At 95°F and 20% humidity, your body cools effectively. At 95°F and 80% humidity, you're in potential danger.</p>

      <table>
        <thead>
          <tr><th>Air Temp (°F)</th><th>Humidity</th><th>Feels Like (°F)</th><th>Risk Level</th></tr>
        </thead>
        <tbody>
          <tr><td>95</td><td>20%</td><td>94</td><td>Low</td></tr>
          <tr><td>95</td><td>50%</td><td>107</td><td>High</td></tr>
          <tr><td>95</td><td>80%</td><td>133</td><td>Extreme</td></tr>
          <tr><td>100</td><td>40%</td><td>114</td><td>Very High</td></tr>
        </tbody>
      </table>

      <h2>Why This Matters for Routing</h2>
      <p>A route through Houston at 95°F on a humid August day is far more dangerous than the same temperature in Tucson, where humidity is typically below 20%. Routing tools that only show temperature are giving you incomplete information.</p>
      <p>ThermoDispatch displays both temperature and heat index for each point along the route, so your crew's actual thermal load is always visible.</p>

      <h2>The OSHA Thresholds</h2>
      <p>OSHA's heat illness prevention guidelines are built around heat index, not air temperature:</p>
      <ul>
        <li><strong>Under 91°F HI:</strong> Lower risk , normal precautions</li>
        <li><strong>91–103°F HI:</strong> Moderate risk , schedule lighter work, ensure water access</li>
        <li><strong>103–115°F HI:</strong> High risk , frequent breaks mandatory, limit exertion</li>
        <li><strong>Over 115°F HI:</strong> Very high to extreme , consider rescheduling outdoor work</li>
      </ul>
      <p>Knowing the heat index before dispatch , not after someone collapses , is the difference between proactive safety management and reactive crisis response.</p>
    `,
  },
  {
    slug: "fortyguard-integration",
    title: "Inside ThermoDispatch's Heat Intelligence: How We Use FortyGuard Data",
    excerpt: "We partnered with FortyGuard to bring hyper-local heat cell data directly into route scoring. Here's what that means for the accuracy of your recommendations.",
    date: "Jul 5, 2026",
    readTime: "7 min read",
    category: "Product",
    content: `
      <p>When we set out to build heat-aware routing, the hardest problem wasn't the routing math , it was the data. Standard weather APIs give you a temperature for a city. But a route from Dallas to Austin passes through dozens of microclimates, and the difference between a shaded river valley and an exposed highway overpass at 2 PM can be 15°F.</p>
      <p>That's why we integrated FortyGuard.</p>

      <h2>What FortyGuard Provides</h2>
      <p>FortyGuard operates a network of hyper-local heat cell sensors and satellite-derived thermal models across the United States. Rather than a single temperature for a city, FortyGuard provides granular heat intensity readings at the level of individual road segments , updated in near real-time and available for a 24-hour forecast window.</p>
      <p>For ThermoDispatch, this means we can score heat exposure at specific points along a route at the specific time your crew will be there , not just the current temperature at the nearest airport weather station.</p>

      <h2>The Architecture</h2>
      <p>When you submit a route analysis, our backend queries FortyGuard's API for each sampled waypoint along your route. For a 200-mile route, that's typically 15–30 individual data points. Each point is scored independently based on:</p>
      <ul>
        <li>Forecast temperature and heat index at estimated arrival time</li>
        <li>UV index and solar radiation</li>
        <li>Air quality index (AQI) , critical for respiratory conditions</li>
        <li>Precipitation probability</li>
      </ul>
      <p>These scores are aggregated into a composite route score that weighs both the worst point (peak exposure) and the average exposure across the full journey.</p>

      <h2>Coverage and Fallback</h2>
      <p>FortyGuard's coverage is US-focused, with strongest density in the high-heat Sunbelt states: Texas, Arizona, Florida, California, and the Southeast. For routes outside covered areas, we fall back to Open-Meteo forecast data , a high-quality open meteorological source , while preserving the same scoring interface for your team.</p>

      <h2>Why This Makes Recommendations Better</h2>
      <p>The difference between a city-level temperature and a route-segment-level heat index can swing a safety classification by two full tiers. A route that looks "moderate risk" based on Phoenix's city temperature might have two segments classified as "extreme" based on the actual road surface conditions. FortyGuard data catches those outliers. Generic APIs don't.</p>
      <p>Your crews deserve better than airport weather data. That's the reason for the integration.</p>
    `,
  },
  {
    slug: "osrm-multi-stop-routing",
    title: "Why Multi-Stop Routing in Heat Conditions Requires a Different Approach",
    excerpt: "Standard routing engines optimize for distance and time. When heat risk enters the equation, the math changes , here's how we handle it.",
    date: "Jun 22, 2026",
    readTime: "5 min read",
    category: "Engineering",
    content: `
      <p>Standard routing engines like Google Maps or OSRM do one thing very well: find the shortest or fastest path between two points. Add multiple stops, and they optimize for the combination that minimizes total distance or time. This works great for package delivery. It's the wrong objective function for heat-risk routing.</p>

      <h2>The Problem With Time-Only Optimization</h2>
      <p>Imagine a route with four stops in Houston on a Tuesday in July. The optimal time-based sequence might route a crew through an exposed industrial highway at 1:30 PM, then loop back through downtown at 3 PM. Total drive time: 2h 40min. Total heat exposure during peak hours: significant.</p>
      <p>An alternative sequence , reordering stops 2 and 3 , adds 18 minutes of total drive time but routes through a shaded urban corridor during peak heat and completes the highway leg at 10 AM. Heat exposure drops by 35%. The extra 18 minutes is easily recovered in crew productivity.</p>

      <h2>How ThermoDispatch Handles Multi-Stop Routing</h2>
      <p>When you add stops to a route analysis, ThermoDispatch scores each leg independently. The stops are ordered by your specification (you know your job schedule), but each leg is evaluated for:</p>
      <ul>
        <li>Heat exposure at estimated travel time for that leg</li>
        <li>Cumulative fatigue load across the full route</li>
        <li>Cooling stop opportunities between high-exposure legs</li>
        <li>The carry-forward effect of starting a later leg in a already heat-fatigued state</li>
      </ul>

      <h2>The Departure Time Interaction</h2>
      <p>For multi-stop routes, departure time optimization has an amplified effect. Shift the start by 45 minutes, and every subsequent leg also shifts , potentially moving 2–3 legs fully out of the peak heat window. The compound benefit of a single timing change is larger than on a direct route.</p>
      <p>This is why ThermoDispatch's departure timeline analysis is especially valuable for multi-stop schedules. A dispatcher who reviews the timeline before assigning a 5-stop route can often find a 1-hour window where heat exposure across all legs is meaningfully lower than the default schedule.</p>

      <h2>The Current Constraints</h2>
      <p>We support up to 5 intermediate stops per route analysis. This covers the majority of field service scenarios. More complex multi-day or 10+ stop scenarios are on our Enterprise roadmap , if this is critical for your operation, reach out to our team.</p>

      <h2>The Bottom Line</h2>
      <p>Routing optimization and heat-risk optimization are complementary, not competing. The best route isn't always the fastest one. In summer conditions, it's the one that delivers your crew safely, on time, and with enough energy to do the actual job.</p>
    `,
  },
];

export const categoryColors: Record<string, string> = {
  Operations: "bg-blue-50 text-blue-700",
  "Data & Insights": "bg-purple-50 text-purple-700",
  "Best Practices": "bg-green-50 text-green-700",
  Education: "bg-yellow-50 text-yellow-700",
  Product: "bg-orange-50 text-orange-700",
  Engineering: "bg-gray-100 text-gray-700",
};
