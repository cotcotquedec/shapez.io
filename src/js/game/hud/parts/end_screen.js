import { InputReceiver } from "../../../core/input_receiver";
import { makeDiv } from "../../../core/utils";
import { SOUNDS } from "../../../platform/sound";
import { T } from "../../../translations";
import { BaseHUDPart } from "../base_hud_part";
import { DynamicDomAttach } from "../dynamic_dom_attach";

/**
 * Full screen overlay shown once the player has completed the last configured
 * level of the campaign (see HubGoals.isGameWon).
 */
export class HUDEndScreen extends BaseHUDPart {
    initialize() {
        this.visible = false;

        this.domAttach = new DynamicDomAttach(this.root, this.element, {
            timeToKeepSeconds: 0,
        });

        this.root.signals.storyGoalCompleted.add(this.onGoalCompleted, this);
    }

    shouldPauseGame() {
        return this.visible;
    }

    isBlockingOverlay() {
        return this.visible;
    }

    createElements(parent) {
        this.inputReciever = new InputReceiver("end-screen");

        this.element = makeDiv(parent, "ingame_HUD_EndScreen", ["noBlur"]);

        const dialog = makeDiv(this.element, null, ["dialog"]);

        makeDiv(dialog, null, ["title"], T.ingame.endScreen.title);
        makeDiv(dialog, null, ["desc"], T.ingame.endScreen.desc);

        this.btnClose = document.createElement("button");
        this.btnClose.classList.add("close", "styledButton");
        this.btnClose.innerText = T.ingame.endScreen.continue;
        dialog.appendChild(this.btnClose);

        this.trackClicks(this.btnClose, this.close);
    }

    /**
     * @param {number} level
     */
    onGoalCompleted(level) {
        if (!this.root.hubGoals.isGameWon()) {
            return;
        }

        this.root.soundProxy.playUi(SOUNDS.levelComplete);
        this.root.app.gameAnalytics.noteMinor("game.campaign.complete");

        this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReciever);
        this.visible = true;
    }

    close() {
        this.root.app.inputMgr.makeSureDetached(this.inputReciever);
        this.visible = false;
    }

    cleanup() {
        this.root.app.inputMgr.makeSureDetached(this.inputReciever);
    }

    update() {
        this.domAttach.update(this.visible);
    }
}
