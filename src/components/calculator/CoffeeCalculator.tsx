'use client'

import { useState } from 'react'
import { formatSGD, formatSGDDecimals } from '@/lib/utils'

const COFFEE_PRICES = {
  kopitiam: 1.5,
  hawker: 1.8,
  cafe: 6.5,
  starbucks: 9.0,
}

type CoffeeType = keyof typeof COFFEE_PRICES

const COFFEE_LABELS: Record<CoffeeType, string> = {
  kopitiam: 'Kopitiam Kopi',
  hawker: 'Hawker Centre',
  cafe: 'Indie Café',
  starbucks: 'Starbucks',
}

export default function CoffeeCalculator() {
  const [coffeeType, setCoffeeType] = useState<CoffeeType>('cafe')
  const [cupsPerDay, setCupsPerDay] = useState(2)
  const [annualReturn, setAnnualReturn] = useState(7)
  const [years, setYears] = useState(30)

  const dailyCost = COFFEE_PRICES[coffeeType] * cupsPerDay
  const monthlyCost = dailyCost * 30
  const yearlyCost = dailyCost * 365

  // Future value of monthly investment
  const monthlyInvestment = monthlyCost
  const monthlyRate = annualReturn / 100 / 12
  const months = years * 12
  const futureValue =
    monthlyRate > 0
      ? monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthlyInvestment * months

  const totalContributed = monthlyCost * months

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Daily Coffee Cost Calculator</h2>
        <p className="text-blue-200 mt-1 text-sm">
          See what small daily habits cost you over time — and what investing that money could look like.
        </p>
      </div>

      <div className="p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Coffee Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(COFFEE_PRICES) as CoffeeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCoffeeType(type)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      coffeeType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div>{COFFEE_LABELS[type]}</div>
                    <div className={`text-xs mt-0.5 ${coffeeType === type ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatSGDDecimals(COFFEE_PRICES[type])}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cups per day: <span className="text-blue-600">{cupsPerDay}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={cupsPerDay}
                onChange={(e) => setCupsPerDay(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span><span>5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Annual return: <span className="text-blue-600">{annualReturn}%</span>
              </label>
              <input
                type="range"
                min={3}
                max={12}
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>3%</span><span>12%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Investment period: <span className="text-blue-600">{years} years</span>
              </label>
              <input
                type="range"
                min={5}
                max={40}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5 yrs</span><span>40 yrs</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Your Coffee Spend
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Daily</span>
                <span className="font-semibold text-gray-800">{formatSGDDecimals(dailyCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Monthly</span>
                <span className="font-semibold text-gray-800">{formatSGD(monthlyCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Yearly</span>
                <span className="font-semibold text-gray-800">{formatSGD(yearlyCost)}</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-blue-700 text-sm uppercase tracking-wide">
                If Invested Instead
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-blue-500 text-sm">Total contributed</span>
                <span className="font-semibold text-blue-700">{formatSGD(totalContributed)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-500 text-sm">Investment gains</span>
                <span className="font-semibold text-green-600">{formatSGD(futureValue - totalContributed)}</span>
              </div>
              <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
                <span className="text-blue-700 font-semibold text-sm">Future value</span>
                <span className="font-bold text-blue-800 text-xl">{formatSGD(futureValue)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              * Assumes monthly compounding at the selected annual return rate. This is illustrative only and not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
