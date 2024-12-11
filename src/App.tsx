import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const InsuranceComparison = () => {
  // Key parameters as state variables
  const [startYear, setStartYear] = useState(2024);
  const [currentAge, setCurrentAge] = useState(41);
  const [viktorLifeExpectancy, setViktorLifeExpectancy] = useState(87);
  const [gannaLifeExpectancy, setGannaLifeExpectancy] = useState(87);

  const [child1CurrentAge, setChild1CurrentAge] = useState(19);
  const [child2CurrentAge, setChild2CurrentAge] = useState(16);

  const [gbzStopPayAge, setGbzStopPayAge] = useState(60);
  const [gbzStabilizeAge, setGbzStabilizeAge] = useState(67);
  const [annualStabilizationAmount, setAnnualStabilizationAmount] = useState(3000);
  const [interestRate, setInterestRate] = useState(2); // percent

  const [initialBasePremium, setInitialBasePremium] = useState(680.36);
  const [pkvSurcharge, setPkvSurcharge] = useState(0); // %
  const [basePremiumIncrease, setBasePremiumIncrease] = useState(3); // %
  const [childIncrease, setChildIncrease] = useState(3);  // %
  const [gkvIncrease, setGkvIncrease] = useState(3);    // %

  const [childPremium, setChildPremium] = useState(223.75);
  const [gkvBase, setGkvBase] = useState(2200.00);
  const [deductiblePerPerson, setDeductiblePerPerson] = useState(800);

  // After 67 rates:
  const [baseGkvRate, setBaseGkvRate] = useState(14.6); // %
  const [gkvSurcharge, setGkvSurchargeVal] = useState(2); // %
  const [deutscheRente, setDeutscheRente] = useState(2800); // €
  const [aerzteversorgung, setAerzteversorgung] = useState(4000); // €

  const totalYears = gannaLifeExpectancy - currentAge;

  const calculateProjection = () => {
    // Apply PKV surcharge
    const adjustedBasePremium = initialBasePremium * (1 + pkvSurcharge / 100);

    let GBZ_fund = 0;
    const data = [];

    // Pre-calculate baseline GKV at 67
    const totalGkvRate = baseGkvRate + gkvSurcharge; // e.g. 14.6 + 2 = 16.6%
    const totalPension = deutscheRente + aerzteversorgung;
    const baseGKVAt67 = totalPension * (totalGkvRate / 100);

    for (let i = 0; i <= totalYears; i++) {
      const year = startYear + i;
      const age = currentAge + i;

      const viktorCovered = age <= viktorLifeExpectancy;
      const gannaCovered = age <= gannaLifeExpectancy;

      const child1LeaveYear = startYear + (25 - child1CurrentAge);
      const child2LeaveYear = startYear + (25 - child2CurrentAge);
      const child1Covered = year < child1LeaveYear; 
      const child2Covered = year < child2LeaveYear;

      const yearsFrom41 = age - currentAge;
      const bpIncreaseFraction = basePremiumIncrease / 100.0;
      const currentBasePremiumCalc = adjustedBasePremium * Math.pow(1 + bpIncreaseFraction, yearsFrom41);

      // GBZ Discount logic
      let hasGBZDiscount = false;
      let monthlyDiscount = 0;
      if (age >= gbzStabilizeAge) {
        if (GBZ_fund >= annualStabilizationAmount) {
          hasGBZDiscount = true;
          monthlyDiscount = annualStabilizationAmount / 12;
        }
      }

      // Adult PKV premiums
      let currentViktorPKV = 0;
      let currentGannaPKV = 0;

      if (viktorCovered) {
        if (age <= gbzStopPayAge) {
          currentViktorPKV = currentBasePremiumCalc * 1.1;
        } else if (age < gbzStabilizeAge) {
          currentViktorPKV = currentBasePremiumCalc;
        } else {
          const discounted = currentBasePremiumCalc - (hasGBZDiscount ? monthlyDiscount : 0);
          currentViktorPKV = discounted > 0 ? discounted : 0;
        }
      }

      if (gannaCovered) {
        if (age <= gbzStopPayAge) {
          currentGannaPKV = currentBasePremiumCalc * 1.1;
        } else if (age < gbzStabilizeAge) {
          currentGannaPKV = currentBasePremiumCalc;
        } else {
          const discounted = currentBasePremiumCalc - (hasGBZDiscount ? monthlyDiscount : 0);
          currentGannaPKV = discounted > 0 ? discounted : 0;
        }
      }

      // Child premiums
      const chIncFraction = childIncrease / 100.0;
      const childMultiplier = Math.pow(1 + chIncFraction, i);
      const currentChild1PKV = child1Covered ? (childPremium * childMultiplier) : 0;
      const currentChild2PKV = child2Covered ? (childPremium * childMultiplier) : 0;

      // GKV logic:
      const gkvIncFraction = gkvIncrease / 100.0;
      let currentGKV = 0;

      if (age < 67) {
        // Before retirement, GKV grows from gkvBase
        const gkvMultiplier = Math.pow(1 + gkvIncFraction, i);
        currentGKV = gkvBase * gkvMultiplier;
      } else {
        // After 67, start from baseGKVAt67 and apply gkvIncrease% each year after 67
        const yearsAfter67 = age - 67;
        currentGKV = baseGKVAt67 * Math.pow(1 + gkvIncFraction, yearsAfter67);
      }

      // Deductibles
      let membersWithDeductible = 0;
      if (viktorCovered) membersWithDeductible++;
      if (gannaCovered) membersWithDeductible++;
      if (child1Covered) membersWithDeductible++;
      if (child2Covered) membersWithDeductible++;
      const annualDeductible = membersWithDeductible * deductiblePerPerson;
      const monthlyDeductible = annualDeductible / 12;

      const totalMonthlyPKV = currentViktorPKV + currentGannaPKV + currentChild1PKV + currentChild2PKV + monthlyDeductible;
      const annualPKV = Math.round(totalMonthlyPKV * 12);
      const annualGKV = Math.round(currentGKV * 12);

      // GBZ contributions
      let annualGBZContributions = 0;
      if (age <= gbzStopPayAge) {
        let adultsCount = 0;
        if (viktorCovered) adultsCount++;
        if (gannaCovered) adultsCount++;
        const monthlyGBZperAdult = currentBasePremiumCalc * 0.1;
        annualGBZContributions = Math.round(monthlyGBZperAdult * adultsCount * 12);
      }

      // Update GBZ fund at year end
      let GBZ_fund_end = GBZ_fund + annualGBZContributions;

      if (age >= gbzStabilizeAge && hasGBZDiscount) {
        GBZ_fund_end -= annualStabilizationAmount;
        if (GBZ_fund_end < 0) GBZ_fund_end = 0;
      }

      const intFraction = interestRate / 100.0;
      GBZ_fund_end = Math.round(GBZ_fund_end * (1 + intFraction));
      GBZ_fund = GBZ_fund_end;

      const prev = data[data.length - 1] || { cumulativePKV: 0, cumulativeGKV: 0 };
      const cumulativePKV = prev.cumulativePKV + annualPKV;
      const cumulativeGKV = prev.cumulativeGKV + annualGKV;

      let comment = '';
      const gbzEndYearCalc = startYear+(gbzStopPayAge - currentAge);
      const gbzStabilizeYear = startYear+(gbzStabilizeAge - currentAge);
      const child1LY = startYear+(25 - child1CurrentAge);
      const child2LY = startYear+(25 - child2CurrentAge);

      if (year === child1LY) comment = 'Child 1 leaves';
      if (year === child2LY) comment = 'Child 2 leaves';
      if (year === gbzEndYearCalc) comment = 'GBZ ends (61)';
      if (year === gbzStabilizeYear) comment = 'GBZ stabilization (67)';

      data.push({
        year,
        age,
        monthlyPKV: Math.round(totalMonthlyPKV),
        monthlyGKV: Math.round(currentGKV),
        monthlyGBZ: (age <= gbzStopPayAge) ? Math.round(currentBasePremiumCalc*0.1*((viktorCovered?1:0)+(gannaCovered?1:0))) : 0,
        GBZ_fund: GBZ_fund,
        PKV: annualPKV,
        GKV: annualGKV,
        cumulativePKV,
        cumulativeGKV,
        difference: cumulativeGKV - cumulativePKV,
        viktorBasePremium: Math.round(currentBasePremiumCalc),
        gannaBasePremium: Math.round(currentBasePremiumCalc),
        child1Premium: Math.round(currentChild1PKV),
        child2Premium: Math.round(currentChild2PKV),
        deductible: Math.round(monthlyDeductible),
        coveredMembers: membersWithDeductible,
        comment
      });
    }

    return data;
  };

  const data = calculateProjection();
  const finalYear = data[data.length - 1];
  const firstYear = data[0];

  return (
    <div className="w-full p-4 space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-2">Input Parameters</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-1 space-y-2">
            <h3 className="font-semibold">General</h3>
            <label className="block">
              <span className="text-sm">Start Year</span>
              <input type="number" className="w-full border p-1" value={startYear} onChange={e=>setStartYear(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Current Age</span>
              <input type="number" className="w-full border p-1" value={currentAge} onChange={e=>setCurrentAge(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Viktor LE</span>
              <input type="number" className="w-full border p-1" value={viktorLifeExpectancy} onChange={e=>setViktorLifeExpectancy(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Ganna LE</span>
              <input type="number" className="w-full border p-1" value={gannaLifeExpectancy} onChange={e=>setGannaLifeExpectancy(parseInt(e.target.value))}/>
            </label>
            <h3 className="font-semibold mt-4">Pensions</h3>
            <label className="block">
              <span className="text-sm">Deutsche Rente (€)</span>
              <input type="number" className="w-full border p-1" value={deutscheRente} onChange={e=>setDeutscheRente(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Ärzteversorgung (€)</span>
              <input type="number" className="w-full border p-1" value={aerzteversorgung} onChange={e=>setAerzteversorgung(parseFloat(e.target.value))}/>
            </label>
          </div>
          <div className="col-span-1 space-y-2">
            <h3 className="font-semibold">Children</h3>
            <label className="block">
              <span className="text-sm">Child1 Age Now</span>
              <input type="number" className="w-full border p-1" value={child1CurrentAge} onChange={e=>setChild1CurrentAge(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Child2 Age Now</span>
              <input type="number" className="w-full border p-1" value={child2CurrentAge} onChange={e=>setChild2CurrentAge(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Child Premium</span>
              <input type="number" step="0.01" className="w-full border p-1" value={childPremium} onChange={e=>setChildPremium(parseFloat(e.target.value))}/>
            </label>
            <h3 className="font-semibold mt-4">PKV Surcharge</h3>
            <label className="block">
              <span className="text-sm">PKV Surcharge (%)</span>
              <input type="number" step="0.1" className="w-full border p-1" value={pkvSurcharge} onChange={e=>setPkvSurcharge(parseFloat(e.target.value))}/>
            </label>
          </div>
          <div className="col-span-1 space-y-2">
            <h3 className="font-semibold">GBZ</h3>
            <label className="block">
              <span className="text-sm">GBZ Stop Pay Age</span>
              <input type="number" className="w-full border p-1" value={gbzStopPayAge} onChange={e=>setGbzStopPayAge(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">GBZ Stabilize Age</span>
              <input type="number" className="w-full border p-1" value={gbzStabilizeAge} onChange={e=>setGbzStabilizeAge(parseInt(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Annual Stabilization €</span>
              <input type="number" step="0.01" className="w-full border p-1" value={annualStabilizationAmount} onChange={e=>setAnnualStabilizationAmount(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Interest Rate (%)</span>
              <input type="number" step="0.001" className="w-full border p-1" value={interestRate} onChange={e=>setInterestRate(parseFloat(e.target.value))}/>
            </label>
          </div>
          <div className="col-span-1 space-y-2">
            <h3 className="font-semibold">Premiums & Rates</h3>
            <label className="block">
              <span className="text-sm">Initial Base Premium</span>
              <input type="number" step="0.01" className="w-full border p-1" value={initialBasePremium} onChange={e=>setInitialBasePremium(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Base Premium Increase (%)</span>
              <input type="number" step="0.001" className="w-full border p-1" value={basePremiumIncrease} onChange={e=>setBasePremiumIncrease(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Child Increase (%)</span>
              <input type="number" step="0.001" className="w-full border p-1" value={childIncrease} onChange={e=>setChildIncrease(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">GKV Increase (%)</span>
              <input type="number" step="0.001" className="w-full border p-1" value={gkvIncrease} onChange={e=>setGkvIncrease(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">GKV Base</span>
              <input type="number" step="0.01" className="w-full border p-1" value={gkvBase} onChange={e=>setGkvBase(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Deductible/Person (€)</span>
              <input type="number" step="1" className="w-full border p-1" value={deductiblePerPerson} onChange={e=>setDeductiblePerPerson(parseInt(e.target.value))}/>
            </label>
            <h3 className="font-semibold mt-4">GKV Rates After 67</h3>
            <label className="block">
              <span className="text-sm">Base GKV Rate (%)</span>
              <input type="number" step="0.1" className="w-full border p-1" value={baseGkvRate} onChange={e=>setBaseGkvRate(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">GKV Surcharge (%)</span>
              <input type="number" step="0.1" className="w-full border p-1" value={gkvSurcharge} onChange={e=>setGkvSurchargeVal(parseFloat(e.target.value))}/>
            </label>
            <h3 className="font-semibold mt-4">Pensions After 67</h3>
            <label className="block">
              <span className="text-sm">Deutsche Rente (€)</span>
              <input type="number" step="1" className="w-full border p-1" value={deutscheRente} onChange={e=>setDeutscheRente(parseFloat(e.target.value))}/>
            </label>
            <label className="block">
              <span className="text-sm">Ärzteversorgung (€)</span>
              <input type="number" step="1" className="w-full border p-1" value={aerzteversorgung} onChange={e=>setAerzteversorgung(parseFloat(e.target.value))}/>
            </label>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold">PKV vs GKV Cost Comparison (GBZ Lifecycle with Depletion)</h2>
        <p className="text-sm text-gray-600 mb-2">
          Adjust parameters above and see changes below.<br/>
          GBZ fund grows with contributions & interest, reduced after stabilization if enough funds available.<br/>
          After 67, GKV = (DeutscheRente+Ärzteversorgung)*(Rate%) and continues to grow annually by gkvIncrease%.
        </p>
        {finalYear && firstYear && (
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">Lifetime Summary:</h3>
            <ul className="text-sm space-y-1">
              <li>Initial Monthly PKV: {firstYear.monthlyPKV}€</li>
              <li>Initial Monthly GKV: {firstYear.monthlyGKV}€</li>
              <li>Total PKV: {(finalYear.cumulativePKV / 1000).toFixed(0)}k€</li>
              <li>Total GKV: {(finalYear.cumulativeGKV / 1000).toFixed(0)}k€</li>
              <li>Difference (GKV - PKV): {(finalYear.difference / 1000).toFixed(0)}k€</li>
            </ul>
          </div>
        )}
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [`${value.toLocaleString()}€`, name]}
              labelFormatter={(yearLabel) => {
                const datum = data.find(d => d.year === +yearLabel);
                return datum 
                  ? `Year: ${yearLabel} (Age: ${datum.age})
Monthly PKV: ${datum.monthlyPKV}€
Monthly GKV: ${datum.monthlyGKV}€
GBZ Fund: ${datum.GBZ_fund.toLocaleString()}€`
                  : `Year: ${yearLabel}`;
              }}
            />
            <Legend />
            <ReferenceLine x={startYear+(25 - child1CurrentAge)} stroke="blue" label="Child1 Leaves" />
            <ReferenceLine x={startYear+(25 - child2CurrentAge)} stroke="blue" label="Child2 Leaves" />
            <ReferenceLine x={startYear+(gbzStopPayAge - currentAge)} stroke="purple" label="GBZ ends (61)" />
            <ReferenceLine x={startYear+(gbzStabilizeAge - currentAge)} stroke="purple" label="GBZ stabilization" />
            <Line type="monotone" dataKey="PKV" stroke="#2196F3" name="Annual PKV Cost" />
            <Line type="monotone" dataKey="GKV" stroke="#4CAF50" name="Annual GKV Cost" />
            <Line type="monotone" dataKey="GBZ_fund" stroke="#FFC107" name="GBZ Fund" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="overflow-x-auto mt-8 w-full">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Age</th>
              <th className="px-4 py-2 bg-blue-50">Monthly PKV</th>
              <th className="px-4 py-2 bg-green-50">Monthly GKV</th>
              <th className="px-4 py-2">Monthly GBZ</th>
              <th className="px-4 py-2">GBZ Fund</th>
              <th className="px-4 py-2 bg-blue-50">Annual PKV</th>
              <th className="px-4 py-2 bg-green-50">Annual GKV</th>
              <th className="px-4 py-2">Viktor Base</th>
              <th className="px-4 py-2">Ganna Base</th>
              <th className="px-4 py-2 bg-blue-50">Child 1</th>
              <th className="px-4 py-2 bg-blue-50">Child 2</th>
              <th className="px-4 py-2">Deductible</th>
              <th className="px-4 py-2">Covered</th>
              <th className="px-4 py-2">Comments</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{row.year}</td>
                <td className="px-4 py-2">{row.age}</td>
                <td className="px-4 py-2 bg-blue-50">{row.monthlyPKV.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-green-50">{row.monthlyGKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.monthlyGBZ.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.GBZ_fund.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.PKV.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-green-50">{row.GKV.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.viktorBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.gannaBasePremium.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.child1Premium.toLocaleString()}€</td>
                <td className="px-4 py-2 bg-blue-50">{row.child2Premium.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.deductible.toLocaleString()}€</td>
                <td className="px-4 py-2">{row.coveredMembers}</td>
                <td className="px-4 py-2">{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InsuranceComparison;
