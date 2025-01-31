import { eth } from "state/eth" // ETH state provider
import { ethers } from "ethers" // Ethers
import { formatFixed } from "@ethersproject/bignumber"
import { useEffect, useState } from "react" // React
import { createContainer } from "unstated-next" // State management
import { BigNumber } from "ethers"
import axios from 'axios'

const CompetitionABI = require("abi/CompetitionAbi.json")
const ERC20ABI = require("abi/ERC20Abi.json")
const UINT256_MAX = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

export interface ICompetition {
  id?: number
  title?: string
  description?: string
  instruction?: string
  countSold?: number
  countTotal?: number
  countMine?:number
  maxPerPerson?: number
  path?: string
  forGuest?: boolean
  forMember?: boolean
  priceForGuest?: number
  priceForMember?: number
  status?: number
  timeUpdated?: Date,
  timeEnd?: Date
  timeStart?: Date
  winner?: IUser
  logoImage?: string,
  winnerImage?: string,
  images?: string[]
}

export interface IUser {
  id?: string
  firstName?: string
  lastName?: string
  nickName?: string
  email?: string
  phone1?: string
  phone2?: string
  address?: string
  avatar?: string
  approved?: boolean
  isMember?: boolean
  isOwner?: boolean
  joinTime?: Date
  paidTime?: Date
  untilTime?: Date
  totalPaid?: BigNumber
  creditPlus?: BigNumber
  creditMinus?: BigNumber
  creditBalance?: BigNumber
  balanceETH?: BigNumber
  balanceToken?: BigNumber
}

function useToken() {
  const defaultProvider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL??"https://speedy-nodes-nyc.moralis.io/0e1178f702f6a0f85209f04a/avalanche/testnet")
  let contractCompetition: ethers.Contract
  let contractToken: ethers.Contract
  let tokenAddress: string

  const { address, provider } = eth.useContainer()

  const [user, setUser] = useState<IUser>({})
  const [dataLoading, setDataLoading] = useState<boolean>(true) // Data retrieval status
  const [competitions, setCompetitions] = useState<ICompetition[]>([])
  const [lastIndex, setLastIndex] = useState(0)
  const [feePerMonth, setFeePerMonth] = useState<BigNumber>()
  const [feePerYear, setFeePerYear] = useState<BigNumber>()
  const [creditsPerMonth, setCreditsPerMonth] = useState<BigNumber>()
  
  /**
   * Get contract
   * @returns {ethers.Contract} signer-initialized contract
   */
  const getContract = async() => {
    contractCompetition = new ethers.Contract(
      String(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS),
      CompetitionABI,
      address?provider?.getSigner():defaultProvider
    )
  }

  const getToken = async () => {
    if(!tokenAddress)
      tokenAddress = await contractCompetition.token()
    contractToken = new ethers.Contract(
      tokenAddress,
      ERC20ABI,
      address?provider?.getSigner():defaultProvider
    )
    getBalance()
  }

  const signMessage = async (msg:any) => {
    const signer = address?provider?.getSigner()??defaultProvider.getSigner():defaultProvider.getSigner();
    const signature = await signer.signMessage(msg);
    return signature;
  }

  const verifyMessage = async (msg:any, signature:any) => {
    try {
      const signerAddress = await ethers.utils.verifyMessage(msg, signature)
      console.log(signerAddress, address)
      if(signerAddress.toLowerCase() !== address?.toLowerCase())
        return false
      else 
        return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  const createNewCompetition = async (countTotal:number, priceForGuest:string, priceForMember:string, maxPerPerson:number): Promise<void> => {
    // If not authenticated throw
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    const tx = await contractCompetition.create(countTotal, priceForGuest, priceForMember, maxPerPerson)
    await tx.wait()
    setLastIndex(lastIndex+1)
    getBalance()
  }

  const updateCompetition = async (id:number, countTotal:number, priceForGuest:string, priceForMember:string, maxPerPerson:number): Promise<void> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    const tx = await contractCompetition.update(id, countTotal, priceForGuest, priceForMember, maxPerPerson)
    await tx.wait()
    getBalance()
    // syncStatus()
  }

  const startCompetition = async (comp: ICompetition, endTime:number): Promise<void> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    const tx = await contractCompetition.start(comp.id, endTime)
    await tx.wait()
    comp.timeStart = new Date()
    comp.timeEnd = new Date(endTime*1000)
    comp.status = 1
    getBalance()
  }

  const finishCompetition = async (comp: ICompetition): Promise<any> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    const tx = await contractCompetition.draw(comp.id)
    await tx.wait()
    return await (new Promise((resolve, reject) => {
      contractCompetition.provider.once({
        address: contractCompetition.address,
        topics: [ ethers.utils.id("Drawn(uint256,uint256)"),ethers.utils.hexZeroPad(`0x${Number(comp.id).toString(16)}`,32) ]
      }, async (log) => {
        console.log(log)
        getBalance()
        const comp1 = await contractCompetition.competitions((comp.id??1)-1)
        resolve(comp1)
      })
    }))    
  }

  const drawWinner = async (comp: ICompetition): Promise<any> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    const tx = await contractCompetition.finish(comp.id)
    await tx.wait()
    return await contractCompetition.competitions((comp.id??1)-1)
  }

  const buyTicket = async (comp: ICompetition, count: number, unclaimed:boolean=false): Promise<ICompetition> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    if(!user.approved) {
      await getToken()
      const tx = await contractToken?.approve(contractCompetition.address, UINT256_MAX)
      await tx.wait()
      setUser(user=>{
        return {...user, approved:true}
      })
    }
    console.log(comp.id, count)
    if(unclaimed)
      await(await contractCompetition.buyWithUnclaimed(comp.id, count)).wait()
    else
      await( await contractCompetition.buy(comp.id, count)).wait()

      getBalance()
    return await contractCompetition.competitions((comp.id??1)-1)
  }

  const payForMonth = async (months:number): Promise<void> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    if(!user.approved) {
      await getToken()
      const tx = await contractToken?.approve(contractCompetition.address, UINT256_MAX)
      await tx.wait()
      setUser(user=>{
        return {...user, approved:true}
      })
    }
    const tx = await contractCompetition.payFeePerMonth(months)
    await tx.wait()
    getBalance()
    getMember()
  }

  const payForYear = async (years:number): Promise<void> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    if(!contractCompetition)
      await getContract()
    if(!user.approved) {
      await getToken()
      const tx = await contractToken?.approve(contractCompetition.address, UINT256_MAX)
      await tx.wait()
      setUser(user=>{
        return {...user, approved:true}
      })
    }
    const tx = await contractCompetition.payFeePerYear(years)
    await tx.wait()
    getBalance()
    getMember()
  }

  const getAllowance = async (): Promise<boolean> => {
    if (!address) {
      throw new Error("Not Authenticated")
    }
    await getToken()
    const approved:BigNumber = await contractToken.allowance(address, contractCompetition.address)
    if(approved.eq(0))
      return false
    return true
  }

  const getOwnerAddress = async (): Promise<string> => {
    return await contractCompetition.owner()
  }

  const isSponser = async (account:string): Promise<boolean> => {
    return await contractCompetition.sponsers(account)
  }

  /**
   * Collects competitions for id
   * @param {number} id competition id
   * @returns {Promise<object>} competition 
   */
  const getCompetitions = async (): Promise<any[]> => {
    return await contractCompetition.getCompetitions()
  }


  const getMember = async (account?:string) => {
    contractCompetition.members(account??address).then((member:any)=>{
      const timeUntil = new Date(member.timeUntil*1000)
      const isMember = timeUntil>new Date()
      if(isMember)
        setUser(user=>{
          return {
            ...user,
            isMember, 
            totalPaid:member.balance, 
            creditPlus:member.creditsPlus,
            creditMinus:member.creditsMinus,
            joinTime:new Date(member.timeStart*1000),
            untilTime:timeUntil,
            paidTime:new Date(member.timeLastPaid*1000)
          }
        })
      else
        setUser(user=>{
          return {
            ...user, 
            isMember:false,
            balance: undefined, 
            creditPlus:undefined,
            creditMinus:undefined,
            joinTime:undefined,
            untilTime:undefined,
            paidTime:undefined
          }
        })
    })
  }

  const getBalance = async () => {
    if(!address)
      return
    provider?.getBalance(String(address)).then(balance=>setUser(user=>{
      return {...user, balanceETH:balance}
    }))
    contractToken?.balanceOf(address).then((balance:any)=>{
      setUser(user=>{
        return {...user, balanceToken:BigNumber.from(balance)}
      })
    })
    if(user.isMember) contractCompetition.creditBalance(address).then((balance:any)=>setUser(user=>{
      return {...user, creditBalance:balance}
    }))
  }

  const getConfig = async () => {
    contractCompetition.feePerMonth().then((fee:any)=>setFeePerMonth(fee))
    contractCompetition.feePerYear().then((fee:any)=>setFeePerYear(fee))
    contractCompetition.creditsPerMonth().then((credits:any)=>setCreditsPerMonth(credits))
  }

  /**
   * After authentication, update number of tokens to claim + claim status
   */
  const syncStatus = async (): Promise<void> => {
    setDataLoading(true)
    if(!contractCompetition)
      await getContract()
    const rows = await getCompetitions()
    const res = await axios.get(`/api/competition/${address??''}`)
    competitions.splice(0, competitions.length)
    
    for(let row of rows) {
      const id = row.id.toNumber()
      if(!res.data.data[id] || res.data.data[id]===undefined) continue
      const rowData = res.data.data[id]
      competitions.push({
        id: id,
        title: rowData.title,
        description: rowData.description,
        logoImage: rowData.logo_url,
        winnerImage: rowData.winner_url,
        images: rowData.images?JSON.parse(rowData.images):[],
        forGuest: row.priceForGuest.gt(-1),
        forMember: row.priceForMember.gt(-1),
        priceForGuest: row.priceForGuest.gt(-1)?Number(formatFixed(row.priceForGuest,18)):0,
        priceForMember: row.priceForMember.gt(-1)?Number(formatFixed(row.priceForMember,18)):0,
        status: row.status,
        timeEnd: row.timeEnd.gt(0)?new Date(row.timeEnd.toNumber()*1000):undefined,
        timeStart: row.timeEnd.gt(0)?new Date(row.timeStart.toNumber()*1000):undefined,
        countTotal: row.countTotal,
        countSold: row.countSold,
        countMine: rowData.my_tickets,
        maxPerPerson: row.maxPerPerson,
        winner: row.winner?{
          id: row.winner,
          firstName: rowData.winner_first_name,
          lastName: rowData.winner_last_name,
          nickName: rowData.winner_first_name || rowData.winner_last_name?`${rowData.winner_first_name} ${rowData.winner_last_name}`:`0x${row.winner.substring(2, 12)}...${row.winner.slice(-10)}`,
          email: rowData.winner_email,
          phone1: rowData.winner_phone1,
          phone2: rowData.winner_phone2,
          address: rowData.winner_address
        }:{}
      } as ICompetition)
    }
    competitions.sort((c1: ICompetition, c2:ICompetition)=>{
      if(c1.timeUpdated && c2.timeUpdated)
        return c1.timeUpdated > c2.timeUpdated? -1: 1
      return 0
    })
    setLastIndex(rows.length)
    setDataLoading(false)
  }

  // On load:
  useEffect(() => {
    getContract()
    getToken()
    if(provider) {
      if(address) {
        // contractCompetition.connect(provider.getSigner())
        // contractToken?.connect(provider.getSigner())
        // contractToken.connect(provider.getSigner())
        setUser(user=>{
          return {
            ...user, 
            id: address,
            nickName: `0x${address?.substring(2, 6)}...${address?.slice(-4)}`
          }
        })
        axios.get(`/api/account/${address}`).then(res=>{
          setUser(user=>{
            return {
              ...user, 
              id:address,
              firstName:res.data.first_name,
              lastName:res.data.last_name,
              nickName:res.data?`${res.data.first_name} ${res.data.last_name}`:`0x${address.substring(2, 6)}...${address.slice(-4)}`,
              email:res.data.email,
              avatar: res.data?.avatar_url?.startsWith('https://')?res.data.avatar_url:'/avatar.png'
            }
          })
        })      
        getBalance()
        getAllowance().then(approved=>setUser(user=>{
          return {...user, approved}
        }))
        isSponser(address).then((ret:boolean)=>setUser(user=>{
          return {...user, isOwner: ret}
        }))
        getMember(address)
        getConfig()
      }
    }
    syncStatus()
  }, [provider, address])

  return {
    dataLoading,
    competitions,
    user,
    feePerMonth,
    feePerYear,
    creditsPerMonth,
    lastIndex,
    signMessage,
    verifyMessage,
    createNewCompetition,
    updateCompetition,
    startCompetition,
    finishCompetition,
    drawWinner,
    buyTicket,
    setCompetitions,
    setUser,
    payForMonth,
    payForYear,
    syncStatus
  }
}

// Create unstated-next container
export const token = createContainer(useToken)
