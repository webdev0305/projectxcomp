import { useState, useRef, useEffect } from 'react'
// import { eth } from "state/eth" // Global state: ETH
import { token, ICompetition } from "state/competition" // Global state: Tokens
import { BigNumber } from "bignumber.js"
import base64 from 'base-64'
import axios from 'axios'
import styles from "styles/pages/Admin.module.scss" // Page styles
import cn from "classnames"
import Router, { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import Link from 'next/link'

export default function EditCompetitionPage() {
    const router = useRouter()
    const { id } = router.query
    const {
        lastIndex,
        dataLoading,
        competitions,
        createNewCompetition,
        updateCompetition,
    } = token.useContainer()
    const formatDate = (date: Date | undefined) => {
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit"
        }).format(date)
    }
    const [competition, setCompetition] = useState<ICompetition>({})
    const [images, setImages] = useState<string[]>([])
    const [logoImage, setLogoImage] = useState<string>()
    const [showImages, setShowImages] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [imageType, setImageType] = useState('')
    const now = new Date().getTime()
    const timeEnds = new Date(now + 86400000 * 7 + 600000)
    const timeDraws = new Date(Math.floor(timeEnds.getTime() / 3600000) * 3600000 + 3600000)
    const description = "\n" +
        "* This is a guaranteed draw regardless of ticket sales.\n" +
        "If not all tickets are sold the prize value will be proportionate to the amount of tickets sold as percentage.\n" +
        "Example: Competition is for 0.1BTC, 100 tickets available, 50 sold by draw time, prize will be 0.05BTC."

    const readFile = (file: File) => {
        return new Promise(resolve => {
            let reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const baseURL = reader.result
                resolve(baseURL);
            }
        })
    }

    const onFileChange = async (e: any) => {
        const file = e?.target?.files[0]
        try {
            readFile(file).then(result => {
                if (imageType == 'logo')
                    setLogoImage(String(result))
                else if (imageType == 'winner')
                    competition.winnerImage = String(result)
                else
                    setImages(images => {
                        return [...images, String(result)]
                    })
            })
        } catch (error) {
            console.log('Error uploading file: ', error)
        }
    }
    const onImageCancel = (index: number) => {
        images.splice(index, 1)
        setImages(images => {
            return [...images]
        })
    }
    const onImageRemove = (index: number) => {
        competition.images?.splice(index, 1)
        setCompetition({ ...competition })
    }

    const uploadData = async (data: any) => {
        const config = {
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'X-API-Key': 'cbRh4B5ZJE8gjPoIEKkK58IAfdxuysg1sVSOMtrso1mi7tJypTt3rr7m9M9vBAhG'
            },
            onUploadProgress: (event: any) => {
                console.log(`Current progress:`, Math.round((event.loaded * 100) / event.total));
            },
        };
        return await axios.post('https://deep-index.moralis.io/api/v2/ipfs/uploadFolder', data, config);
    }

    const hiddenFileInput = useRef<HTMLInputElement>(null);
    const selectImage = (type: string = '') => {
        setImageType(type)
        if (hiddenFileInput && hiddenFileInput.current)
            hiddenFileInput.current.click()
    }
    const handleChange = (e: any) => {
        const field = e.target.name
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setCompetition({
            ...competition, [field]: value
        })
    }
    const submitContact = async (event: any) => {
        event.preventDefault();
        setSubmitting(true)
        const data: any[] = []
        if (logoImage)
            data.push({
                path: 'logo', content: logoImage
            })
        let i = 0
        if (images.length) for (const img of images) {
            data.push({
                path: new Date().getTime() + (++i), content: img
            })
        }
        if (data.length) {
            const res = await uploadData(data)
            if (res.data && res.data.length == data.length) {
                if (logoImage) {
                    competition.logoImage = res.data.shift().path
                    setLogoImage(undefined)
                }
                const imgs = competition.images ?? []
                for (const r of res.data) {
                    imgs.push(r.path)
                }
                competition.images = imgs
            }
        }
        competition.timeUpdated = new Date()
        try {
            let msg = ''
            if (competition.id) {
                await updateCompetition(
                    competition.id,
                    competition.countTotal ?? 0,
                    new BigNumber(competition.priceForGuest ?? 0).shiftedBy(18).toString(),
                    competition.forMember ? new BigNumber(competition.priceForMember ?? 0).shiftedBy(18).toString() : '-1',
                    competition.maxPerPerson ?? 0
                )
                for (let i = 0; i < competitions.length; i++) {
                    if (competitions[i].id == competition.id) {
                        competitions.splice(i, 1)
                        competitions.unshift(competition)
                        break;
                    }
                }
                msg = 'Updated successfully!'
            } else {
                console.log(competition)
                await createNewCompetition(
                    competition.countTotal ?? 0,
                    new BigNumber(competition.priceForGuest ?? 0).shiftedBy(18).toString(),
                    competition.forMember ? new BigNumber(competition.priceForMember ?? 0).shiftedBy(18).toString() : '-1',
                    competition.maxPerPerson ?? 0
                )
                msg = 'Created successfully!'
                competition.id = lastIndex + 1
                competition.status = 0
                competitions.unshift(competition)
            }
            axios.post('/api/competition/insert', {
                id: competition.id,
                title: competition.title,
                description: competition.description??description,
                logo_url: competition.logoImage,
                images: JSON.stringify(competition.images)
            }).then(res2 => {
                if (res2.data.success) {
                    toast.success(msg)
                    setTimeout(() => {
                        setImages([])
                        Router.push('/list')
                    }, 3000)
                }
            })
        } catch (ex: any) {
            if (typeof ex == 'object')
                toast.error(`Error! ${(ex.data?.message ?? null) ? ex.data.message.replace('execution reverted: ', '') : ex.message}`)
            else
                toast.error(`Error! ${ex}`)
        }
        // setImages([])
        setSubmitting(false)
    }
    useEffect(() => {
        const index = Number(id)
        for (const comp of competitions) {
            if (index == comp.id) {
                setCompetition(comp)
                break
            }
        }
    }, [id, dataLoading, competitions])
    return (
        <div className="page-wrapper">
            <div className="inner-hero-section style--five">
                <div className="bg-shape">
                    <img src="assets/images/elements/inner-hero-shape.png" alt="image" />
                </div>
            </div>
            <div className="mt-minus-100 pb-120">
                <div className="container">
                    <div className="row">
                        <form onSubmit={submitContact} className="basis-full">
                            <input type="hidden" name="id" value={competition.id ?? 0} />
                            <input
                                className="hidden"
                                type="file"
                                ref={hiddenFileInput}
                                accept="image/png, image/gif, image/jpeg"
                                onChange={onFileChange}
                            />
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Title</label>
                                </div>
                                <div className='col-lg-8'>
                                    <input
                                        className = "text-white p-3 "
                                        value={competition.title ?? ''}
                                        name="title"
                                        onChange={handleChange}
                                        required
                                    />

                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center '>
                                    <label className='text-2xl'>Description</label>
                                </div>
                                <div className='col-lg-8'>
                                    <textarea
                                        className = "text-white  p-3"
                                        value={competition.description ?? description}
                                        name="description"
                                        rows={5}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Price of Ticket</label>
                                </div>
                                <div className='col-lg-8'>
                                    <div className="md:w-1/4">
                                        <div className='flex flex-wrap'>
                                            {/* <label className='w-full md:w-1/4 hidden'>
                                                <input type="input" className="mt-3 mr-2 text-white w-6" name="forGuest" checked={true} onChange={handleChange}/>
                                                For Guest
                                            </label> */}
                                            <input
                                                type="number"
                                                className = "text-white"
                                                step="any"
                                                value={competition.priceForGuest ?? ''}
                                                name="priceForGuest"
                                                onChange={handleChange}
                                                required={true}
                                            />
                                        </div>
                                        <div className='flex flex-wrap hidden'>
                                            <label className='w-full md:w-1/4'>
                                                <input type="checkbox" className="mt-3 mr-2" name="forMember" checked={competition.forMember} onChange={handleChange} />
                                                For Members
                                            </label>
                                            <input
                                                className = "text-white"
                                                type="number"
                                                step="any"
                                                value={competition.priceForMember ?? ''}
                                                name="priceForMember"
                                                onChange={handleChange}
                                                disabled={!competition.forMember}
                                                required={competition.forMember}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Number of Tickets</label>
                                </div>
                                <div className='col-lg-8 '>
                                    <input
                                        type="number"
                                        className="text-white"
                                        value={competition.countTotal ?? ''}
                                        name="countTotal"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Max tickets per wallet</label>
                                </div>
                                <div className='col-lg-8'>
                                    <input
                                        type="number"
                                        className="text-white"
                                        value={competition.maxPerPerson ?? ''}
                                        name="maxPerPerson"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Logo Image</label>
                                </div>
                                <div className='col-lg-8 max-w-sm'>
                                    <div className={cn(styles.imageBox, "cursor-pointer")} onClick={() => selectImage('logo')}>
                                        {competition.logoImage || logoImage ?
                                            <img src={logoImage ?? competition.logoImage} height={100} alt='Logo Image' /> :
                                            <span className={styles.emptyBox}>Logo Image</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap my-3">
                                <div className='col-lg-4 text-center'>
                                    <label className='text-2xl'>Detail Images</label>
                                </div>
                                <div className='col-lg-8 text-white'>
                                    <div className="md:w-3/4">
                                        <div className='flex flex-wrap justify-between'>
                                            <button type="button" className='py-2 px-4 rounded-xl border-2 cursor-pointer hover:bg-white hover:text-black' onClick={() => selectImage()}>Add Image</button>
                                            {((competition.images?.length ?? 0) > 0 || images?.length > 0) && (
                                                <button type="button" className='py-2 px-4 rounded-xl border-2 cursor-pointer hover:bg-white hover:text-black' onClick={() => setShowImages(!showImages)}>{showImages ? 'Hide' : 'Show'} Images</button>
                                            )}
                                        </div>
                                        {showImages && ((competition.images?.length ?? 0) > 0 || images?.length > 0) ? (
                                            <div className='flex flex-wrap mt-4'>
                                                {competition.images?.map((path: any, index: number) => (
                                                    <div key={index} className={styles.imageBox}>
                                                        <img src={path} height={100} alt='file' />
                                                        <span onClick={() => onImageRemove(index)} className={styles.btnDeleteImage}>&times;</span>
                                                    </div>
                                                ))}
                                                {images?.map((image, index) => (
                                                    <div key={index} className={styles.imageBox}>
                                                        <img src={image} width={200} height={200} alt='file' />
                                                        <span onClick={() => onImageCancel(index)} className={styles.btnDeleteImage}>&times;</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className='text-center my-3'>
                                <button
                                    disabled={submitting}
                                    type="submit"
                                    className="px-4 py-2 my-4 font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-700"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                                {' '}
                                <Link href="/list" passHref>
                                    <button
                                        disabled={submitting}
                                        className="px-4 py-2 my-4 font-bold text-white bg-gray-500 rounded-lg hover:bg-gray-700"
                                    >
                                        Back
                                    </button>
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
