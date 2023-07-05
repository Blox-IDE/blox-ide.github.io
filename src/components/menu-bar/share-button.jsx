import classNames from 'classnames';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import Button from '../button/button.jsx';

import styles from './share-button.css';

function authenticate() {
    return new Promise((resolve, reject) => {
        const login = window.open(
            `https://auth.itinerary.eu.org/auth/?redirect=${btoa(window.location.origin)}&name=Blox IDE`,
            "Scratch Authentication",
            `scrollbars=yes,resizable=yes,status=no,location=yes,toolbar=no,menubar=no,width=768,height=512,left=200,top=200`
        );
        if (!login) {
            reject("PopupBlocked");
        }
        let cantAccessAnymore = false;
        let finished = false;
        let interval = null;
        interval = setInterval(() => {
            if (login?.closed && (!finished)) {
                clearInterval(interval);
                try {
                    login.close();
                } catch {
                    // what a shame we couldnt close the window that doesnt exist anymore
                }
                reject("PopupClosed");
            }
            try {
                const query = login.location.search;
                if (!cantAccessAnymore) return;
                const parameters = new URLSearchParams(query);
                const privateCode = parameters.get("privateCode");
                finished = true;
                clearInterval(interval);
                setTimeout(() => {
                    login.close();
                }, 1000);
                resolve(privateCode);
            } catch {
                // due to strange chrome bug, window still has the previous url on it so we need to wait until we switch to the auth site
                cantAccessAnymore = true;
                // now we cant access the location yet since the user hasnt left the authentication site
            }
        }, 10);
    })
}

const ShareButton = ({
    className,
    isShared,
    onClick
}) => (
    <Button
        className={classNames(
            className,
            styles.shareButton,
            { [styles.shareButtonIsShared]: isShared }
        )}
        onClick={onClick}
    >
        <FormattedMessage
            defaultMessage="Upload"
            description="Label for project share button"
            id="gui.menuBar.bxshare"
        />
    </Button>
);

ShareButton.propTypes = {
    className: PropTypes.string,
    isShared: PropTypes.bool,
    onClick: PropTypes.func
};

const getProjectThumbnail = () => {
    return new Promise((resolve, reject) => {
        window.vm.renderer.requestSnapshot(uri => {
            resolve(uri);
        })
    })
}
const getProjectUri = () => {
    return new Promise((resolve, reject) => {
        window.vm.saveProjectSb3().then(blob => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = element => {
                    resolve(element.target.result);
                }
                reader.readAsDataURL(blob);
            })
        }).then(resolve);
    })
}

window.addEventListener("message", async (e) => {
    if (!e.origin.startsWith(`https://Blox IDE.site`)) {
        return;
    }

    if (!e.data.p4) {
        return
    }

    const packagerData = e.data.p4;
    if (packagerData.type !== 'validate') {
        return;
    }

    const imageUri = await getProjectThumbnail();
    e.source.postMessage({
        p4: {
            type: 'image',
            uri: imageUri
        }
    }, e.origin);
    const projectUri = await getProjectUri();
    e.source.postMessage({
        p4: {
            type: 'project',
            uri: projectUri
        }
    }, e.origin);
    e.source.postMessage({
        p4: {
            type: 'finished'
        }
    }, e.origin);
})

ShareButton.defaultProps = {
    onClick: () => {
        let _projectName = document.title.split(" - ");
        _projectName.pop();
        const projectName = _projectName.join(" - ");

        const url = location.origin;
        window.open(`https://Blox IDE.site/upload?name=${encodeURIComponent(projectName)}&external=${url}`, "_blank");
        return;
    }
};

export default ShareButton;
