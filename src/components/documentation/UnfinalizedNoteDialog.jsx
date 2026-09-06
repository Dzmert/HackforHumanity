import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function UnfinalizedNoteDialog({ open, onContinueEditing, onLeaveIncomplete, leaving }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onContinueEditing(); }}>
      <DialogContent className="bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="text-[#7D4037]">This note hasn't been finalized</DialogTitle>
          <DialogDescription className="text-[#3D342F]">
            This note hasn't been finalized. If something happens to you before you finish it, another caseworker won't have an actionable record. Leave anyway?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onContinueEditing}>Continue Editing</Button>
          <Button className="bg-[#CF664A] hover:bg-[#B9573D]" onClick={onLeaveIncomplete} disabled={leaving}>
            {leaving ? 'Leaving…' : 'Leave as Incomplete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}