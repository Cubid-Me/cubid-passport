// @ts-nocheck
import { Profile, useLogin } from '@lens-protocol/react-web';
import { useProfilesManaged } from '@lens-protocol/react-web';
import { profile } from 'console';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useDisconnect } from 'wagmi';


export type LoginAsProps = {
    profile: Profile;
    wallet: string;
    onSuccess: (profile: Profile) => void;
};

function LoginAs({ profile, wallet, onSuccess }: LoginAsProps) {
    const { execute, loading } = useLogin();

    const login = async () => {
        const result = await execute({
            address: wallet,
            profileId: profile.id,
        });

        if (result.isSuccess()) {
            return onSuccess(profile);
        }
        localStorage.removeItem("lens-loggin")
        window.alert(result.error.message);
    };

    return (
        <button disabled={loading} onClick={login}>
            {profile.handle?.fullHandle ?? profile.id}
        </button>
    );
}

type LoginOptionsProps = {
    wallet: string;
    onSuccess: (profile: Profile) => void;
};

export function LoginOptions({ wallet, onSuccess }: LoginOptionsProps) {

    const { data: profiles, error, loading } = useProfilesManaged({
        for: wallet,
        includeOwned: true
    });
    const { disconnect } = useDisconnect()

    useEffect(() => {
        if (!loading && profiles.length === 0) {
            localStorage.removeItem("lens-loggin")
            disconnect()
            toast.error("No profiles managed by this wallet.")
        }
        if (profiles?.length !== 0) {
            onSuccess(profiles?.[0])
        }
    }, [loading, profiles, onSuccess])

    if (loading) {
        return <p>Loading...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    if (profiles.length === 0) {
        return <p>No profiles managed by this wallet.</p>;
    }

    return (
        <div>
            {profiles.map((profile: any) => (
                <LoginAs key={profile.id} wallet={wallet} profile={profile} onSuccess={onSuccess} />
            ))}
        </div>
    );
}