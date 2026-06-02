// tests/run.js — 测试运行器
// 运行方式：node tests/run.js

const suites = [
  { name: 'validator', module: require('./validator.test') },
  { name: 'date', module: require('./date.test') }
]

let totalPassed = 0
let totalFailed = 0

for (const suite of suites) {
  console.log(`\n📋 ${suite.name}`)
  for (const { name, fn } of suite.module.tests) {
    try {
      fn()
      console.log(`  ✅ ${name}`)
      totalPassed++
    } catch (err) {
      console.log(`  ❌ ${name}`)
      console.log(`     ${err.message}`)
      totalFailed++
    }
  }
}

console.log(`\n─────────────────────────────────────────`)
console.log(`通过：${totalPassed}  失败：${totalFailed}  合计：${totalPassed + totalFailed}`)

if (totalFailed > 0) process.exit(1)
