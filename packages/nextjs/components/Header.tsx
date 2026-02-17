"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
};

export const menuLinks: HeaderMenuLink[] = [
  { label: "Live", href: "/tournaments" },
  { label: "Debug", href: "/debug" },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "text-white" : "text-neutral-500"
              } hover:text-white text-sm font-medium transition-colors px-3 py-1.5`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </>
  );
};

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 z-20 bg-[#0A0A0A] border-b border-[#1A1A1A]">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        <div className="flex items-center gap-6">
          <details className="dropdown lg:hidden" ref={burgerMenuRef}>
            <summary className="btn btn-ghost btn-sm p-1 hover:bg-transparent">
              <Bars3Icon className="h-5 w-5 text-neutral-400" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 bg-[#111111] border border-[#2A2A2A] squircle-sm w-48"
              onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
            >
              <HeaderMenuLinks />
            </ul>
          </details>
          <Link href="/" className="font-black text-lg text-white tracking-tight">
            BLUFF
          </Link>
          <ul className="hidden lg:flex items-center gap-1">
            <HeaderMenuLinks />
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <RainbowKitCustomConnectButton />
          {isLocalNetwork && <FaucetButton />}
        </div>
      </div>
    </div>
  );
};
