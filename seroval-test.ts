import { toJSONAsync } from 'seroval'
async function main() {
  const out = await toJSONAsync({ data: { excludedWordIds: [] } })
  console.log(JSON.stringify(out))
}
main()
