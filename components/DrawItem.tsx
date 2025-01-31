import Link, { LinkProps } from "next/link"
import { ICompetition, token } from "state/competition";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios"

interface Prop extends LinkProps {
    item: ICompetition
}

export default function DrawItem({href,item}:Prop) {
    const [timeout, setTimedout] = useState(false)
    const timer = setInterval(() => {
        if (!timeout && item.timeEnd && item.timeEnd <= new Date()) {
            setTimedout(true)
            clearInterval(timer)
        }
    }, 1000)
    const endTime = item.timeEnd?item.timeEnd.getTime():0;
    // const startTime = item.timeStart?item.timeStart.getTime():0;
    const startTime = new Date().getTime();
    const diff = Math.abs(endTime - startTime);
    const diffDays = !timeout?Math.ceil(diff / (1000 * 3600*24)):0;
    const diffHours = !timeout?Math.ceil(diff / (1000 * 3600)):0;
    const diffMins = !timeout?Math.ceil(diff / (1000 * 60)):0;
    return (
        <div className="contest-card">
            <div className="contest-card__thumb">
                <Link href={href} passHref>
                    <img src={item.logoImage} alt="image"/>
                </Link>
                    <div className="contest-num flex flex-col items-center">
                        <span>Comp no:</span>
                        <h4 className="number text-[22px]">{item.id}</h4>
                    </div>
            </div>
            <div className="contest-card__content">
                <div className="left">
                    <h5 className="contest-card__name text-[20px] uppercase">{item.title}</h5>
                </div>
                <div className="right">
                    <span className="contest-card__price">{item.countMine}</span>
                    <p className="text-white text-[18px] capitalize my-0">tickets</p>
                </div>
            </div>
            <div className="contest-card__footer">
                <ul className="contest-card__meta">
                    <li>
                        <i className="las la-clock text-white"></i>
                        {diffDays > 1?
                            <span>{diffDays} d</span>
                        :
                        diffHours > 1? 
                        <span>{diffHours} hrs</span>
                        :
                            <span>{diffMins} mins</span>
                        }
                    </li>
                    <li>
                        <i className="las la-ticket-alt text-white"></i>
                        <span>{Number(item.countTotal) - Number(item.countSold)}</span>
                        <p className="my-0 text-white">Remaining</p>
                    </li>
                </ul>
            </div>
        </div>
    );
}
